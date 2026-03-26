import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Validate webhook secret
  const expectedSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  const receivedSecret = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    console.warn("❌ Invalid or missing Evolution webhook secret");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  });

  try {
    const rawBody = await req.text();
    console.log(`📩 Raw webhook body (first 500 chars): ${rawBody.slice(0, 500)}`);

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("❌ Failed to parse webhook body as JSON");
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine event type from path or body
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    let eventType: string;
    if (lastSegment && lastSegment !== "evolution-webhook") {
      eventType = lastSegment.toUpperCase().replace(/-/g, "_").replace(/\./g, "_");
    } else {
      eventType = (body.event ?? "UNKNOWN").toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
    }

    // Extract instance name - Evolution v2 sends it in multiple locations
    const instanceName: string | undefined =
      body.instance ?? body.data?.instance ?? body.instanceName ?? body.sender?.instance;

    console.log(
      `📩 Evolution webhook: event=${eventType}, instance=${instanceName ?? "unknown"}, keys=${Object.keys(body).join(",")}`,
    );

    if (!instanceName) {
      console.warn("⚠️ No instance name in payload, skipping. Full body:", JSON.stringify(body).slice(0, 500));
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route by event type
    if (eventType === "QRCODE_UPDATED" || eventType === "QRCODE_UPDATE") {
      await handleQrCode(supabase, body, instanceName);
    } else if (eventType === "CONNECTION_UPDATE") {
      await handleConnectionUpdate(supabase, body, instanceName);
    } else if (eventType === "MESSAGES_UPSERT" || eventType === "MESSAGES_UPDATE") {
      await handleInboundMessage(supabase, body, instanceName);
    } else {
      console.log(`ℹ️ Unhandled event: ${eventType}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleQrCode(supabase: any, body: any, instanceName: string) {
  const qrCode: string | undefined =
    body.data?.qrcode?.base64 ?? body.data?.qrcode ?? body.qrcode?.base64 ?? body.qrcode;

  if (!qrCode) {
    console.warn("⚠️ QRCODE_UPDATED but no qr data found");
  }

  const { error } = await supabase
    .from("whatsapp_instances")
    .update({ status: "qr_pending", qr_code: qrCode ?? null })
    .eq("evolution_instance_name", instanceName);

  if (error) {
    console.error("❌ Error updating QR:", error.message);
  } else {
    console.log(`✅ QR updated for ${instanceName}`);
  }
}

async function handleConnectionUpdate(supabase: any, body: any, instanceName: string) {
  const rawState: string | undefined = body.data?.state ?? body.state ?? body.data?.status;
  const state = rawState?.toLowerCase();

  console.log(`🔌 Connection state for ${instanceName}: ${state}`);

  if (state === "open" || state === "connected") {
    const { error } = await supabase
      .from("whatsapp_instances")
      .update({ status: "connected", qr_code: null })
      .eq("evolution_instance_name", instanceName);

    if (error) {
      console.error("❌ Error setting connected:", error.message);
    } else {
      console.log(`✅ ${instanceName} is now connected`);
    }
  } else if (state === "close" || state === "disconnected") {
    const { error } = await supabase
      .from("whatsapp_instances")
      .update({ status: "disconnected", qr_code: null })
      .eq("evolution_instance_name", instanceName);

    if (error) {
      console.error("❌ Error setting disconnected:", error.message);
    } else {
      console.log(`⚠️ ${instanceName} disconnected`);
    }
  }
}

async function handleInboundMessage(supabase: any, body: any, instanceName: string) {
  // Evolution v2 can send data as array or object
  const msgData = Array.isArray(body.data) ? body.data[0] : body.data;
  if (!msgData) {
    console.warn("⚠️ MESSAGES_UPSERT but no message data. Body keys:", Object.keys(body).join(","));
    return;
  }

  const key = msgData.key ?? {};
  const fromMe = key.fromMe === true;
  const remoteJid: string = key.remoteJid ?? "";
  const messageId: string = key.id ?? "";

  // Extract remoteJidAlt — Evolution may provide the real JID for LID contacts
  const remoteJidAlt: string | null = key.remoteJidAlt ?? msgData.remoteJidAlt ?? null;

  // For outgoing messages, update status AND backfill wa_jid/wa_phone on conversation
  if (fromMe) {
    console.log(`⏭️ Outgoing message ${messageId} — checking for status update`);

    // Backfill wa_jid/wa_phone on the conversation if remoteJid is valid
    if (remoteJid && !remoteJid.includes("@g.us")) {
      const outWaJid = remoteJid;
      const baseForPhoneOut = remoteJidAlt ?? remoteJid;
      const outWaPhone = baseForPhoneOut.replace(/@.*$/, "").replace(/\D/g, "");
      if (outWaPhone.length >= 10 && outWaPhone.length <= 15) {
        const { data: convToFix } = await supabase
          .from("wa_conversations")
          .select("id, wa_jid")
          .or(`wa_phone.eq.${outWaPhone},wa_phone.eq.+${outWaPhone},wa_jid.eq.${outWaJid}`)
          .limit(1)
          .maybeSingle();

        if (convToFix && !convToFix.wa_jid) {
          await supabase
            .from("wa_conversations")
            .update({ wa_jid: outWaJid, wa_phone: outWaPhone })
            .eq("id", convToFix.id);
          console.log(
            `🔧 Backfilled wa_jid=${outWaJid}, wa_phone=${outWaPhone} on conversation ${convToFix.id} (fromMe)`,
          );
        }
      }
    }

    if (messageId) {
      const { data: existing } = await supabase
        .from("wa_messages")
        .select("id")
        .eq("meta_message_id", messageId)
        .maybeSingle();

      if (existing) {
        await supabase.from("wa_messages").update({ status: "delivered" }).eq("id", existing.id);
        console.log(`✅ Updated outgoing message ${messageId} to delivered`);
      }
    }
    return;
  }

  if (remoteJid.includes("@g.us")) {
    console.log(`⏭️ Skipping group message from ${remoteJid}`);
    return;
  }

  if (!remoteJid) {
    console.warn(`⚠️ Invalid remoteJid: ${remoteJid}`);
    return;
  }

  // Canonical identifiers
  const wa_jid = remoteJid;
  const isLid = remoteJid.includes("@lid");

  // Detect raw JID: @s.whatsapp.net where remoteJidAlt doesn't provide a real number
  const isRawJid = remoteJid.includes("@s.whatsapp.net") && !remoteJidAlt;

  // For phone: prefer remoteJidAlt (real number) over remoteJid (which may be a LID or raw JID)
  const baseForPhone = remoteJidAlt ?? remoteJid;
  const wa_phone_digits = baseForPhone.replace(/@.*$/, "").replace(/\D/g, "");

  // If it's a raw JID (no remoteJidAlt), don't trust the digits as a real phone
  const validPhone = !isRawJid && !isLid && wa_phone_digits.length >= 10 && wa_phone_digits.length <= 15;
  // For LID with remoteJidAlt providing real digits, allow it
  const validPhoneLid = isLid && remoteJidAlt && wa_phone_digits.length >= 10 && wa_phone_digits.length <= 15;

  // The phone we store: real E.164 digits, or prefixed identifier
  const wa_phone = validPhone || validPhoneLid ? wa_phone_digits : isLid ? `lid:${wa_jid}` : `raw:${wa_jid}`;

  const effectiveValidPhone = validPhone || validPhoneLid;

  console.log("EVOLUTION JIDs", {
    remoteJid,
    remoteJidAlt,
    wa_jid,
    wa_phone,
    isLid,
    isRawJid,
    validPhone: effectiveValidPhone,
  });

  if (!effectiveValidPhone && !isLid && !isRawJid) {
    console.warn(
      `⚠️ Invalid phone digits from remoteJid: ${remoteJid} → "${wa_phone_digits}" (${wa_phone_digits.length} digits). Skipping.`,
    );
    return;
  }

  const message = msgData.message ?? {};
  const pushName: string = msgData.pushName ?? "";

  let bodyText = "";
  let msgType = "text";
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let mediaFilename: string | null = null;

  if (message.conversation) {
    bodyText = message.conversation;
  } else if (message.extendedTextMessage?.text) {
    bodyText = message.extendedTextMessage.text;
  } else if (message.imageMessage) {
    msgType = "image";
    bodyText = message.imageMessage.caption || "[image]";
    mediaMime = message.imageMessage.mimetype || "image/jpeg";
    mediaUrl = msgData.media?.url ?? msgData.mediaUrl ?? null;
  } else if (message.audioMessage) {
    msgType = "audio";
    bodyText = "[audio]";
    mediaMime = message.audioMessage.mimetype || "audio/ogg";
    mediaUrl = msgData.media?.url ?? msgData.mediaUrl ?? null;
  } else if (message.videoMessage) {
    msgType = "video";
    bodyText = message.videoMessage.caption || "[video]";
    mediaMime = message.videoMessage.mimetype || "video/mp4";
    mediaUrl = msgData.media?.url ?? msgData.mediaUrl ?? null;
  } else if (message.documentMessage) {
    msgType = "document";
    bodyText = message.documentMessage.fileName || "[document]";
    mediaMime = message.documentMessage.mimetype || "application/octet-stream";
    mediaFilename = message.documentMessage.fileName || null;
    mediaUrl = msgData.media?.url ?? msgData.mediaUrl ?? null;
  } else if (message.stickerMessage) {
    msgType = "sticker";
    bodyText = "[sticker]";
    mediaMime = message.stickerMessage.mimetype || "image/webp";
  } else if (message.reactionMessage) {
    msgType = "reaction";
    bodyText = message.reactionMessage.text || "❤️";
  } else if (message.contactMessage || message.contactsArrayMessage) {
    msgType = "contact";
    bodyText = "[contact]";
  } else if (message.locationMessage) {
    msgType = "location";
    bodyText = `[location: ${message.locationMessage.degreesLatitude},${message.locationMessage.degreesLongitude}]`;
  } else {
    bodyText = "[unsupported]";
    msgType = "unsupported";
  }

  console.log(`📨 Inbound from ${wa_phone} via ${instanceName}: ${msgType} — "${bodyText.slice(0, 60)}"`);

  // Get instance ID
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("evolution_instance_name", instanceName)
    .single();

  const instanceId: string | null = instance?.id ?? null;

  // === Find existing conversation: wa_jid first, then fallback by wa_phone ===
  let conversation: any = null;
  let needsJidBackfill = false;

  // (a) Primary lookup by wa_jid
  const { data: byJid } = await supabase
    .from("wa_conversations")
    .select("id, status, wa_name, unread_count, wa_phone")
    .eq("wa_jid", wa_jid)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byJid) {
    conversation = byJid;
    console.log(`🔍 Found conversation by wa_jid: ${conversation.id}`);
  } else if (effectiveValidPhone) {
    // (b) Fallback: search by wa_phone for legacy records without wa_jid
    const phoneVariants = [wa_phone, `+${wa_phone}`];
    for (const pv of phoneVariants) {
      const { data } = await supabase
        .from("wa_conversations")
        .select("id, status, wa_name, unread_count, wa_phone")
        .eq("wa_phone", pv)
        .is("wa_jid", null)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        conversation = data;
        needsJidBackfill = true;
        console.log(`🔍 Found legacy conversation by wa_phone=${pv}: ${conversation.id} — will backfill wa_jid`);
        break;
      }
    }
  }

  // === Alias-based lookup before creating a new conversation ===
  if (!conversation) {
    const storedPhone = effectiveValidPhone ? wa_phone : isLid ? `lid:${wa_jid}` : `raw:${wa_jid}`;
    const phoneVariantsForAlias = effectiveValidPhone ? [wa_phone, `+${wa_phone}`, wa_jid] : [storedPhone, wa_jid];

    const uniqueVariants = [...new Set(phoneVariantsForAlias)];

    const { data: aliasMatch } = await supabase
      .from("conversation_phone_aliases")
      .select("conversation_id")
      .in("phone_value", uniqueVariants)
      .limit(1)
      .maybeSingle();

    if (aliasMatch) {
      const { data: existingConv } = await supabase
        .from("wa_conversations")
        .select("id, status, wa_name, unread_count, wa_phone")
        .eq("id", aliasMatch.conversation_id)
        .single();

      if (existingConv) {
        conversation = existingConv;
        console.log(`🔗 Found conversation via phone alias: ${conversation.id} (variants=${uniqueVariants.join(",")})`);

        const aliasPhoneType = storedPhone.includes("@lid") || storedPhone.startsWith("lid:") ? "lid" : "e164";
        await supabase
          .from("conversation_phone_aliases")
          .upsert(
            { conversation_id: conversation.id, phone_value: storedPhone, phone_type: aliasPhoneType },
            { onConflict: "phone_value" },
          );
      }
    }
  }

  if (!conversation) {
    // (mantive seu fluxo de criação/reuso, sem mudanças relevantes)
    let resolvedPhone = effectiveValidPhone ? wa_phone : isLid ? `lid:${wa_jid}` : `raw:${wa_jid}`;
    let resolvedMaeId: string | null = null;
    let resolvedConversationId: string | null = null;

    if (!effectiveValidPhone) {
      if (pushName && instanceId) {
        const { data: instanceConvos } = await supabase
          .from("wa_conversations")
          .select("id, wa_phone, wa_jid, mae_id, wa_name")
          .eq("instance_id", instanceId)
          .not("wa_phone", "like", "lid:%")
          .not("wa_phone", "like", "raw:%")
          .order("last_message_at", { ascending: false })
          .limit(20);

        const matchByName = (instanceConvos ?? []).find((c: any) => {
          const nameMatch = c.wa_name && c.wa_name.trim().toLowerCase() === pushName.trim().toLowerCase();
          const digits = String(c.wa_phone ?? "").replace(/\D/g, "");
          return nameMatch && digits.length >= 10 && digits.length <= 15;
        });

        if (matchByName) {
          resolvedPhone = String(matchByName.wa_phone).replace(/\D/g, "");
          resolvedMaeId = matchByName.mae_id ?? null;
          resolvedConversationId = matchByName.id;
          console.log(
            `🔗 LID/raw resolved via instance conversation: "${pushName}" → phone=${resolvedPhone}, conv=${matchByName.id}`,
          );
        }
      }

      if (!resolvedConversationId && pushName) {
        const { data: siblingMatches } = await supabase
          .from("wa_conversations")
          .select("id, wa_phone, mae_id")
          .ilike("wa_name", pushName.trim())
          .not("wa_phone", "like", "lid:%")
          .not("wa_phone", "like", "raw:%")
          .order("last_message_at", { ascending: false })
          .limit(5);

        const siblingWithPhone = (siblingMatches ?? []).find((row: any) => {
          const digits = String(row?.wa_phone ?? "").replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 15;
        });

        if (siblingWithPhone) {
          resolvedPhone = String(siblingWithPhone.wa_phone).replace(/\D/g, "");
          resolvedMaeId = siblingWithPhone.mae_id ?? null;
          resolvedConversationId = siblingWithPhone.id;
          console.log(
            `🔗 LID/raw resolved via sibling conversation: "${pushName}" → phone=${resolvedPhone}, conv=${siblingWithPhone.id}`,
          );
        }
      }

      if (!resolvedConversationId && pushName) {
        const { data: crmMatch } = await supabase
          .from("mae_processo")
          .select("id, telefone_e164")
          .ilike("nome_mae", pushName.trim())
          .limit(1)
          .maybeSingle();

        if (crmMatch?.telefone_e164) {
          const crmDigits = crmMatch.telefone_e164.replace(/\D/g, "");
          if (crmDigits.length >= 10) {
            resolvedPhone = crmDigits;
            resolvedMaeId = crmMatch.id;
            console.log(`🔗 LID/raw resolved via CRM: "${pushName}" → phone=${crmDigits}, mae_id=${crmMatch.id}`);
          }
        }
      }

      if (resolvedConversationId) {
        const { data: resolvedConv } = await supabase
          .from("wa_conversations")
          .select("id, status, wa_name, unread_count, wa_phone")
          .eq("id", resolvedConversationId)
          .single();

        if (resolvedConv) {
          conversation = resolvedConv;
          needsJidBackfill = false;

          const aliasValue = isLid ? `lid:${wa_jid}` : `raw:${wa_jid}`;
          await supabase
            .from("conversation_phone_aliases")
            .upsert(
              { conversation_id: resolvedConv.id, phone_value: wa_jid, phone_type: isLid ? "lid" : "raw" },
              { onConflict: "phone_value" },
            );
          await supabase
            .from("conversation_phone_aliases")
            .upsert(
              { conversation_id: resolvedConv.id, phone_value: aliasValue, phone_type: isLid ? "lid" : "raw" },
              { onConflict: "phone_value" },
            );

          console.log(
            `🔗 Reusing conversation ${resolvedConv.id} for LID/raw ${wa_jid} (resolved to phone=${resolvedPhone})`,
          );
        }
      }
    }

    if (!conversation) {
      const insertData: any = {
        wa_jid: wa_jid,
        wa_phone: resolvedPhone,
        wa_name: pushName || null,
        status: "open",
        channel: "whatsapp_web",
        active_channel_code: "evolution",
        preferred_channel: "whatsapp_web",
        instance_id: instanceId,
        unread_count: 1,
        last_message_at: new Date().toISOString(),
        last_message_preview: bodyText.slice(0, 200),
        last_inbound_at: new Date().toISOString(),
        ...(resolvedMaeId ? { mae_id: resolvedMaeId } : {}),
      };

      const { data: newConv, error: convErr } = await supabase
        .from("wa_conversations")
        .insert(insertData)
        .select("id")
        .single();

      if (convErr) {
        console.error("❌ Error creating conversation:", convErr.message, JSON.stringify(convErr));
        return;
      }

      conversation = { id: newConv.id, unread_count: 1 };
      console.log(
        `🆕 Created conversation ${newConv.id} for wa_jid=${wa_jid} wa_phone=${insertData.wa_phone} (effectiveValidPhone=${effectiveValidPhone})`,
      );

      const aliasesToInsert = [
        {
          conversation_id: newConv.id,
          phone_value: resolvedPhone,
          phone_type:
            resolvedPhone.startsWith("lid:") || resolvedPhone.includes("@lid")
              ? "lid"
              : resolvedPhone.startsWith("raw:")
                ? "raw"
                : "e164",
        },
      ];
      if (wa_jid !== resolvedPhone) {
        aliasesToInsert.push({
          conversation_id: newConv.id,
          phone_value: wa_jid,
          phone_type: wa_jid.includes("@lid") ? "lid" : "raw",
        });
      }
      if (effectiveValidPhone && wa_phone !== resolvedPhone) {
        aliasesToInsert.push({ conversation_id: newConv.id, phone_value: wa_phone, phone_type: "e164" });
      }

      for (const alias of aliasesToInsert) {
        await supabase.from("conversation_phone_aliases").upsert(alias, { onConflict: "phone_value" });
      }
    }
  } else {
    const updatePayload: any = {
      wa_jid: wa_jid,
      last_message_at: new Date().toISOString(),
      last_message_preview: bodyText.slice(0, 200),
      last_inbound_at: new Date().toISOString(),
      unread_count: (conversation.unread_count ?? 0) + 1,
    };

    if (effectiveValidPhone) {
      updatePayload.wa_phone = wa_phone;
    }

    if (pushName && !conversation.wa_name) {
      updatePayload.wa_name = pushName;
    }

    if (conversation.status === "closed") {
      updatePayload.status = "open";
    }

    if (instanceId) {
      updatePayload.instance_id = instanceId;
      updatePayload.active_channel_code = "evolution";
    }

    const { error: updateErr } = await supabase
      .from("wa_conversations")
      .update(updatePayload)
      .eq("id", conversation.id);

    if (updateErr) {
      console.error("❌ Error updating conversation:", updateErr.message, JSON.stringify(updateErr));
      return;
    }

    console.log(`📝 Updated conversation ${conversation.id}${needsJidBackfill ? " (backfilled wa_jid)" : ""}`);
  }

  // Check for duplicate message
  if (messageId) {
    const { data: existing } = await supabase
      .from("wa_messages")
      .select("id")
      .eq("meta_message_id", messageId)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️ Duplicate message ${messageId}, skipping`);
      return;
    }
  }

  // ✅ NOVO: se for mídia criptografada (mmg.whatsapp.net/.enc), converte para base64 via Evolution e salva no Storage.
  let storedMedia: { publicUrl: string; mime: string; filename: string } | null = null;
  try {
    if (
      (msgType === "audio" || msgType === "image" || msgType === "video" || msgType === "document") &&
      mediaUrl &&
      shouldResolveEncryptedMediaUrl(mediaUrl)
    ) {
      storedMedia = await resolveAndStoreInboundMedia({
        supabase,
        instanceName,
        messageId,
        conversationId: conversation.id,
        msgType,
        pushName,
        fallbackMime: mediaMime ?? "application/octet-stream",
        fallbackFilename: mediaFilename ?? null,
      });
    }
  } catch (e) {
    console.warn(
      `⚠️ Media resolve failed (will keep original mediaUrl or null). messageId=${messageId} type=${msgType}:`,
      String(e?.message ?? e),
    );
  }

  // Insert the message - use "received" status (now allowed by constraint)
  const insertPayload: any = {
    conversation_id: conversation.id,
    meta_message_id: messageId || null,
    direction: "in",
    body: bodyText,
    msg_type: msgType,
    status: "received",
    channel: "whatsapp_web",
    instance_id: instanceId,
  };

  // ✅ Se conseguimos salvar no Storage, guardamos a URL pública (reutilizável).
  // Caso contrário, mantém o mediaUrl original (mas ele pode ser .enc e não serve para reenvio).
  const finalMediaUrl = storedMedia?.publicUrl ?? mediaUrl ?? null;
  const finalMime = storedMedia?.mime ?? mediaMime ?? null;
  const finalFilename = storedMedia?.filename ?? mediaFilename ?? null;

  if (finalMediaUrl) insertPayload.media_url = finalMediaUrl;
  if (finalMime) insertPayload.media_mime = finalMime;
  if (finalFilename) insertPayload.media_filename = finalFilename;

  const { error: msgErr } = await supabase.from("wa_messages").insert(insertPayload);

  if (msgErr) {
    console.error("❌ Error inserting message:", msgErr.message, JSON.stringify(msgErr));
  } else {
    console.log(`✅ Saved inbound message ${messageId} to conversation ${conversation.id}`);
  }
}

/** -------------------- NOVAS FUNÇÕES (MÍDIA) -------------------- */

function shouldResolveEncryptedMediaUrl(url: string): boolean {
  const u = String(url || "").toLowerCase();
  return u.includes("mmg.whatsapp.net") || u.includes(".enc") || u.includes("t62.");
}

async function resolveAndStoreInboundMedia(params: {
  supabase: any;
  instanceName: string;
  messageId: string;
  conversationId: string;
  msgType: string;
  pushName?: string;
  fallbackMime: string;
  fallbackFilename: string | null;
}): Promise<{ publicUrl: string; mime: string; filename: string }> {
  const { supabase, instanceName, messageId, conversationId, msgType, fallbackMime, fallbackFilename } = params;

  if (!messageId) {
    throw new Error("messageId missing (cannot fetch base64 from Evolution)");
  }

  const evoBaseUrl = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
  const evoApiKey = Deno.env.get("EVOLUTION_API_KEY") || "";
  if (!evoBaseUrl || !evoApiKey) {
    throw new Error("Evolution API not configured (EVOLUTION_API_URL/EVOLUTION_API_KEY)");
  }

  // 1) pega base64 via Evolution
  const base64Result = await getBase64FromEvolution({
    evoBaseUrl,
    evoApiKey,
    instanceName,
    messageId,
  });

  const mime = base64Result.mimetype || fallbackMime || "application/octet-stream";
  const ext = guessExtensionFromMime(mime, msgType);
  const filename =
    fallbackFilename && fallbackFilename.trim() ? fallbackFilename.trim() : `${msgType}_${messageId}.${ext}`;

  // 2) sobe para storage (bucket wa-media)
  const bucket = Deno.env.get("WA_MEDIA_BUCKET") || "wa-media";
  const objectPath = `inbound/${conversationId}/${messageId}.${ext}`;

  const publicUrl = await uploadBase64ToSupabaseStorage({
    supabase,
    bucket,
    objectPath,
    base64: base64Result.base64,
    contentType: mime,
    upsert: true,
  });

  console.log(`📦 Stored media in Storage: bucket=${bucket} path=${objectPath}`);

  return { publicUrl, mime, filename };
}

async function getBase64FromEvolution(params: {
  evoBaseUrl: string;
  evoApiKey: string;
  instanceName: string;
  messageId: string;
}): Promise<{ base64: string; mimetype?: string }> {
  const { evoBaseUrl, evoApiKey, instanceName, messageId } = params;

  // Endpoint oficial v2: POST /chat/getBase64FromMediaMessage/{instance}
  // Doc: https://doc.evolution-api.com/v2/api-reference/chat-controller/get-base64 :contentReference[oaicite:1]{index=1}
  const endpoint = `${evoBaseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: evoApiKey,
    },
    body: JSON.stringify({
      message: { key: { id: messageId } },
      // convertToMp4 pode ser útil para vídeo; mantemos default true para compat
      convertToMp4: true,
    }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Evolution getBase64 failed (${res.status}): ${text.slice(0, 300)}`);
  }

  // Algumas versões retornam JSON com base64; outras retornam vazio (dependendo config).
  // Vamos tentar os formatos mais comuns.
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const base64 =
    json?.base64 ??
    json?.data?.base64 ??
    json?.message?.base64 ??
    json?.media?.base64 ??
    json?.response?.base64 ??
    null;

  const mimetype =
    json?.mimetype ?? json?.data?.mimetype ?? json?.mediaType ?? json?.mime_type ?? json?.message?.mimetype ?? null;

  if (!base64 || typeof base64 !== "string") {
    throw new Error(
      "Evolution returned no base64. (Some versions require enabling base64 or media retrieval settings.)",
    );
  }

  return { base64, mimetype: mimetype || undefined };
}

async function uploadBase64ToSupabaseStorage(params: {
  supabase: any;
  bucket: string;
  objectPath: string;
  base64: string;
  contentType: string;
  upsert: boolean;
}): Promise<string> {
  const { supabase, bucket, objectPath, base64, contentType, upsert } = params;

  // remove data URL prefix if present
  const cleanBase64 = base64.includes(",") ? base64.split(",").pop()! : base64;
  const bytes = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType,
    upsert,
    cacheControl: "3600",
  });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // Public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) throw new Error("Storage public URL not available");

  return publicUrl;
}

function guessExtensionFromMime(mime: string, msgType: string): string {
  const m = String(mime || "").toLowerCase();

  if (m.includes("audio/ogg") || m.includes("audio/opus")) return "ogg";
  if (m.includes("audio/mpeg") || m.includes("audio/mp3")) return "mp3";
  if (m.includes("audio/wav")) return "wav";
  if (m.includes("audio/webm")) return "webm";

  if (m.includes("image/png")) return "png";
  if (m.includes("image/webp")) return "webp";
  if (m.includes("image/jpeg") || m.includes("image/jpg")) return "jpg";

  if (m.includes("video/mp4")) return "mp4";
  if (m.includes("video/webm")) return "webm";

  if (m.includes("application/pdf")) return "pdf";

  // fallback por tipo
  if (msgType === "audio") return "ogg";
  if (msgType === "image") return "jpg";
  if (msgType === "video") return "mp4";
  return "bin";
}
