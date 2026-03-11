import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API_VERSION = "v21.0";

/**
 * Upload a media file to Meta's servers and return the media_id.
 */
async function uploadMediaToMeta(
  mediaUrl: string,
  mediaMime: string,
  metaToken: string,
  phoneNumberId: string,
): Promise<string> {
  console.log(`⬇️ Downloading media from: ${mediaUrl.slice(0, 100)}...`);
  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download media: ${fileRes.status} ${fileRes.statusText}`);
  }
  const fileBlob = await fileRes.blob();

  const form = new FormData();
  const filename = mediaMime.includes("ogg")
    ? "audio.ogg"
    : mediaMime.includes("webm")
      ? "audio.webm"
      : mediaMime.includes("mpeg") || mediaMime.includes("mp3")
        ? "audio.mp3"
        : mediaMime.includes("aac")
          ? "audio.aac"
          : "media.bin";

  form.append("file", new File([fileBlob], filename, { type: mediaMime }));
  form.append("messaging_product", "whatsapp");
  form.append("type", mediaMime);

  console.log(`⬆️ Uploading media to Meta (${mediaMime}, ${fileBlob.size} bytes)...`);

  const uploadRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${metaToken}` },
    body: form,
  });

  const uploadBody = await uploadRes.json();
  console.log(`📤 Meta upload response (${uploadRes.status}):`, JSON.stringify(uploadBody).slice(0, 300));

  if (!uploadRes.ok || !uploadBody.id) {
    const errMsg = uploadBody?.error?.message || "Unknown upload error";
    throw new Error(`Meta media upload failed (${uploadRes.status}): ${errMsg}`);
  }

  return uploadBody.id;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const apikeyHeader = req.headers.get("apikey") || "";

  // ✅ NEW: internal call bypass (service role)
  // If called from another Edge Function (e.g., wa-ai-reply / webhook) using service role:
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
  const isInternalCall = bearerToken === serviceRoleKey || apikeyHeader === serviceRoleKey;

  // If not internal, must have Bearer JWT
  if (!isInternalCall) {
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
  }

  let userId: string | null = null;

  if (!isInternalCall) {
    // ✅ existing behavior: validate user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = bearerToken;
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    userId = claimsData.claims.sub;
  } else {
    // internal/system sender (AI or system automation)
    userId = null;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { to, text, conversation_id, type, media_url, media_mime, media_filename, caption } = body;

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to"' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_WA_TOKEN = Deno.env.get("META_WA_TOKEN");
    const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

    if (!META_WA_TOKEN || !META_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Meta credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = to.replace(/\D/g, "");
    const msgType = type || "text";

    console.log(`📤 Sending ${msgType} to +${cleanPhone} (internal=${isInternalCall})`);

    // Build Meta API payload
    let metaPayload: Record<string, unknown>;

    // ── TEMPLATE MESSAGE ──
    if (msgType === "template") {
      const { template_name, template_language, template_components } = body;
      if (!template_name) {
        return new Response(JSON.stringify({ error: "Missing template_name for template message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: {
          name: template_name,
          language: { code: template_language || "pt_BR" },
          components: template_components || [],
        },
      };
    } else if (msgType === "text") {
      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing "text" for text message' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: text },
      };
    } else if (msgType === "audio") {
      if (!media_url) {
        return new Response(JSON.stringify({ error: "Missing media_url for audio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let effectiveMime = media_mime || "audio/ogg";

      if (effectiveMime.includes("webm") && effectiveMime.includes("opus")) {
        effectiveMime = "audio/ogg";
        console.log("🔄 Re-labeling audio/webm;codecs=opus → audio/ogg for Meta compatibility");
      } else if (effectiveMime.includes("webm")) {
        console.error("❌ Unsupported audio format:", effectiveMime);

        if (conversation_id) {
          await adminClient.from("wa_messages").insert({
            conversation_id,
            direction: "out",
            body: "[audio]",
            msg_type: "audio",
            status: "failed",
            sent_by: userId,
            sent_at: new Date().toISOString(),
            media_url,
            media_mime: effectiveMime,
            error_code: "UNSUPPORTED_FORMAT",
            error_message: "Formato de áudio não suportado pela Meta. Grave novamente (OGG/OPUS).",
          });
        }

        return new Response(
          JSON.stringify({
            error: "Unsupported audio format",
            error_message: "Formato de áudio não suportado. Grave novamente.",
            error_code: "UNSUPPORTED_FORMAT",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const mediaId = await uploadMediaToMeta(media_url, effectiveMime, META_WA_TOKEN, META_PHONE_NUMBER_ID);

      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "audio",
        audio: { id: mediaId },
      };
    } else if (msgType === "image") {
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "image",
        image: { link: media_url, caption: caption || undefined },
      };
    } else if (msgType === "video") {
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "video",
        video: { link: media_url, caption: caption || undefined },
      };
    } else if (msgType === "document") {
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "document",
        document: { link: media_url, filename: media_filename || "document", caption: caption || undefined },
      };
    } else {
      return new Response(JSON.stringify({ error: `Unsupported message type: ${msgType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const metaBody = await metaRes.json();
    console.log(`📡 Meta API response (${metaRes.status}):`, JSON.stringify(metaBody).slice(0, 300));

    if (!metaRes.ok) {
      const metaError = metaBody?.error;
      const errorCode = metaError?.code || metaRes.status;
      const errorDetail = `code=${metaError?.code}, msg=${metaError?.message}, type=${metaError?.type}`;
      console.error(`❌ Meta API error ${metaRes.status}: ${errorDetail}`);

      // Check for 24h window error (code 131047)
      const isWindowError = errorCode === 131047 || metaError?.error_subcode === 131047;

      // Save failed message in DB so UI shows the error
      let convoId = conversation_id;
      if (convoId) {
        const bodyText =
          msgType === "text"
            ? text
            : msgType === "template"
              ? `[template: ${body.template_name}]`
              : caption || `[${msgType}]`;
        await adminClient.from("wa_messages").insert({
          conversation_id: convoId,
          direction: "out",
          body: bodyText,
          msg_type: msgType,
          status: "failed",
          sent_by: userId,
          sent_at: new Date().toISOString(),
          media_url: msgType !== "text" && msgType !== "template" ? media_url : null,
          media_mime: media_mime || null,
          media_filename: media_filename || null,
          error_code: String(errorCode),
          error_message: isWindowError
            ? "Janela de 24h expirada. Use um template aprovado para retomar a conversa."
            : metaError?.message || "Erro desconhecido da Meta API",
          template_name: msgType === "template" ? body.template_name : null,
          template_variables: msgType === "template" ? body.template_components || null : null,
        });

        // Log window error as conversation event
        if (isWindowError) {
          await adminClient.from("conversation_events").insert({
            conversation_id: convoId,
            event_type: "window_expired",
            created_by_agent_id: userId,
            meta: { error_code: errorCode },
          });
        }
      }

      return new Response(
        JSON.stringify({
          error: "Meta API error",
          error_message: metaError?.message || "Unknown error",
          error_code: errorCode,
          is_window_error: isWindowError,
          details: metaBody,
        }),
        {
          status: metaRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const metaMsgId = metaBody.messages?.[0]?.id ?? null;

    if (!metaMsgId) {
      console.error("❌ Meta did not return wamid");
      return new Response(JSON.stringify({ error: "Meta did not return message ID", details: metaBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve or create conversation
    let convoId = conversation_id;
    if (!convoId) {
      const { data: existing } = await adminClient
        .from("wa_conversations")
        .select("id")
        .eq("wa_phone", cleanPhone)
        .maybeSingle();
      if (existing) {
        convoId = existing.id;
      } else {
        const { data: newConvo, error: newErr } = await adminClient
          .from("wa_conversations")
          .insert({ wa_phone: cleanPhone, status: "open" })
          .select("id")
          .single();
        if (newErr) throw newErr;
        convoId = newConvo.id;
      }
    }

    // Save outbound message
    const bodyText =
      msgType === "text"
        ? text
        : msgType === "template"
          ? `[template: ${body.template_name}]`
          : caption || `[${msgType}]`;
    await adminClient.from("wa_messages").insert({
      conversation_id: convoId,
      meta_message_id: metaMsgId,
      direction: "out",
      body: bodyText,
      msg_type: msgType,
      status: "sent",
      sent_by: userId, // ✅ will be null for internal/AI
      sent_at: new Date().toISOString(),
      media_url: msgType !== "text" && msgType !== "template" ? media_url : null,
      media_mime: media_mime || null,
      media_filename: media_filename || null,
      template_name: msgType === "template" ? body.template_name : null,
      template_variables: msgType === "template" ? body.template_components || null : null,
    });

    // Update conversation
    await adminClient
      .from("wa_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: bodyText.slice(0, 200),
      })
      .eq("id", convoId);

    console.log(`✅ Message sent. Meta ID: ${metaMsgId}, Conversation: ${convoId}`);

    return new Response(JSON.stringify({ success: true, meta_message_id: metaMsgId, conversation_id: convoId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Send error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", error_message: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
