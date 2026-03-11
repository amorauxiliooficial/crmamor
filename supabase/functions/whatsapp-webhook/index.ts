import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get("META_WA_VERIFY_TOKEN");

  // GET = Meta webhook verification (challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const tokenMatch = token === VERIFY_TOKEN;

    console.log(`🔍 GET verification: mode=${mode}, token_match=${tokenMatch}`);

    if (mode === "subscribe" && tokenMatch) {
      console.log("✅ Webhook verified! Returning challenge as plain text");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("❌ Verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // POST = incoming messages & status updates
  if (req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ✅ Ensure service role is sent as Authorization header
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });

    try {
      const body = await req.json();
      console.log("📩 Webhook payload:", JSON.stringify(body).slice(0, 500));

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Process incoming messages
      if (value?.messages) {
        for (const message of value.messages) {
          const phone = message.from;
          const metaMsgId = message.id;
          const contactName = value.contacts?.[0]?.profile?.name ?? null;
          const msgType = message.type ?? "text";

          // Flags for routing rules
          const isDocLike = msgType === "document" || msgType === "image";
          const isAudio = msgType === "audio";

          // Extract text body or caption
          let textBody: string;
          if (msgType === "text") {
            textBody = message.text?.body ?? "";
          } else if (message[msgType]?.caption) {
            textBody = message[msgType].caption;
          } else {
            textBody = `[${msgType}]`;
          }

          // Extract media ID if present
          const mediaObj = message[msgType];
          const metaMediaId = mediaObj?.id ?? null;
          const mediaMime = mediaObj?.mime_type ?? null;
          const mediaFilename = mediaObj?.filename ?? null;
          const mediaDuration = msgType === "audio" || msgType === "video" ? (mediaObj?.duration ?? null) : null;

          console.log(
            `📨 Message from +${phone} (${contactName}): type=${msgType}, media_id=${metaMediaId?.slice(0, 20)}`,
          );

          // Upsert conversation
          const now = new Date().toISOString();
          const { data: convo, error: convoErr } = await supabase
            .from("wa_conversations")
            .upsert(
              {
                wa_phone: phone,
                wa_name: contactName,
                last_message_at: now,
                last_inbound_at: now,
                last_message_preview: textBody.slice(0, 200),
                status: "open",
              },
              { onConflict: "wa_phone" },
            )
            .select("id, unread_count, labels, status, ai_enabled, ai_agent_id")
            .single();

          if (convoErr || !convo?.id) {
            console.error("❌ Conversation upsert error:", convoErr);
            continue;
          }

          // ✅ Ensure Lead Intake exists for this WhatsApp conversation (with proof logs)
          console.log(`🧩 lead_intake block reached. convo_id=${convo.id}`);
          const { error: leadErr } = await supabase
            .from("lead_intake")
            .upsert({ wa_conversation_id: convo.id }, { onConflict: "wa_conversation_id" });

          if (leadErr) {
            console.error("❌ Lead intake upsert error:", leadErr);
            // do not block message processing
          } else {
            console.log(`✅ lead_intake upsert ok for convo_id=${convo.id}`);
          }

          // Dedup check
          if (metaMsgId) {
            const { data: existingMsg } = await supabase
              .from("wa_messages")
              .select("id")
              .eq("meta_message_id", metaMsgId)
              .maybeSingle();
            if (existingMsg) {
              console.log(`⏭️ Duplicate message ${metaMsgId}, skipping`);
              continue;
            }
          }

          // Insert message with media metadata
          const { data: insertedMsg, error: msgErr } = await supabase
            .from("wa_messages")
            .insert({
              conversation_id: convo.id,
              meta_message_id: metaMsgId,
              direction: "in",
              body: textBody,
              msg_type: msgType,
              status: "delivered",
              meta_media_id: metaMediaId,
              media_mime: mediaMime,
              media_filename: mediaFilename,
              media_duration: mediaDuration,
            })
            .select("id")
            .single();

          if (msgErr) {
            console.error("❌ Message insert error:", msgErr);
            continue;
          }

          // Update unread count
          await supabase
            .from("wa_conversations")
            .update({ unread_count: (convo.unread_count ?? 0) + 1 })
            .eq("id", convo.id);

          console.log(`✅ Saved message ${metaMsgId} in conversation ${convo.id}`);

          // ✅ Routing rules:
          // - audio: ask user to type, do NOT trigger AI
          // - document/image: pause AI and handoff to human
          if (isAudio) {
            const sendUrl = `${supabaseUrl}/functions/v1/whatsapp-send`;
            fetch(sendUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: phone,
                type: "text",
                text: "Recebi seu áudio 😊 No momento eu não consigo ouvir aqui. Você pode me enviar por texto o que precisa? Assim eu te ajudo mais rápido.",
                conversation_id: convo.id,
              }),
            }).catch((err) => console.error("❌ Audio auto-reply send error:", err));

            // Stop here: no AI reply for audio
            continue;
          }

          if (isDocLike) {
            const labels: string[] = Array.isArray(convo.labels) ? convo.labels : [];
            const nextLabels = Array.from(new Set([...labels, "HANDOFF_HUMAN"]));

            await supabase
              .from("wa_conversations")
              .update({ ai_enabled: false, labels: nextLabels })
              .eq("id", convo.id);

            const sendUrl = `${supabaseUrl}/functions/v1/whatsapp-send`;
            fetch(sendUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: phone,
                type: "text",
                text: "Perfeito — recebi seu documento ✅ Vou encaminhar para análise do time e já te retorno aqui.",
                conversation_id: convo.id,
              }),
            }).catch((err) => console.error("❌ Doc/image auto-reply send error:", err));

            // Do not trigger AI when handing off
            // (media download still happens below)
          }

          // Trigger AI auto-reply if eligible (check both ai_enabled column and legacy AI_ON label)
          const convoLabels: string[] = convo.labels || [];
          const aiActive = convo.ai_enabled === true || convoLabels.includes("AI_ON");
          if (
            aiActive &&
            !isDocLike &&
            !convoLabels.includes("HANDOFF_HUMAN") &&
            !convoLabels.includes("AI_PAUSED") &&
            convo.status !== "closed"
          ) {
            const aiUrl = `${supabaseUrl}/functions/v1/wa-ai-reply`;
            console.log(`🤖 Triggering AI reply for conversation ${convo.id}`);
            fetch(aiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                conversation_id: convo.id,
                trigger_message_id: insertedMsg?.id || metaMsgId,
              }),
            }).catch((err) => console.error("❌ AI reply trigger error:", err));
          }

          // Trigger async media download if it's a media message
          if (metaMediaId && insertedMsg?.id) {
            const fnUrl = `${supabaseUrl}/functions/v1/whatsapp-media-download`;
            console.log(`📥 Triggering media download for ${metaMediaId}`);
            fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                message_id: insertedMsg.id,
                meta_media_id: metaMediaId,
              }),
            }).catch((err) => console.error("❌ Media download trigger error:", err));
          }
        }
      }

      // Process status updates (sent/delivered/read/failed)
      if (value?.statuses) {
        for (const st of value.statuses) {
          const metaMsgId = st.id;
          const newStatus = st.status; // sent | delivered | read | failed
          console.log(`📊 Status update: ${metaMsgId} → ${newStatus}`);

          const updatePayload: Record<string, unknown> = { status: newStatus };

          // Add timestamp for each status
          if (newStatus === "sent") updatePayload.sent_at = new Date().toISOString();
          if (newStatus === "delivered") updatePayload.delivered_at = new Date().toISOString();
          if (newStatus === "read") updatePayload.read_at = new Date().toISOString();

          // Capture error details on failure
          if (newStatus === "failed") {
            const errors = st.errors;
            if (errors && errors.length > 0) {
              updatePayload.error_code = String(errors[0].code ?? "");
              updatePayload.error_message = errors[0].title ?? errors[0].message ?? "Unknown error";
            }
          }

          const { error } = await supabase.from("wa_messages").update(updatePayload).eq("meta_message_id", metaMsgId);

          if (error) console.error("❌ Status update error:", error);

          // Capture pricing data from webhook (sent status includes pricing)
          if (st.pricing && newStatus === "sent") {
            const pricing = st.pricing;
            console.log(
              `💰 Pricing data: billable=${pricing.billable}, model=${pricing.pricing_model}, category=${pricing.category}`,
            );

            // Find the message to get conversation_id
            const { data: msgRow } = await supabase
              .from("wa_messages")
              .select("id, conversation_id")
              .eq("meta_message_id", metaMsgId)
              .maybeSingle();

            if (msgRow) {
              // Lookup rate card for cost estimation
              let estimatedCost = 0;
              const category = pricing.category || "service";
              const { data: rateCard } = await supabase
                .from("wa_rate_cards")
                .select("cost_per_message")
                .eq("market", "brazil")
                .eq("category", category)
                .limit(1)
                .maybeSingle();

              if (rateCard) estimatedCost = rateCard.cost_per_message;

              await supabase.from("wa_billing_events").insert({
                message_id: msgRow.id,
                conversation_id: msgRow.conversation_id,
                meta_message_id: metaMsgId,
                billable: pricing.billable !== false,
                pricing_model: pricing.pricing_model || null,
                category: category,
                estimated_cost: pricing.billable !== false ? estimatedCost : 0,
              });

              console.log(`✅ Billing event saved for ${metaMsgId}: ${category} $${estimatedCost}`);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
