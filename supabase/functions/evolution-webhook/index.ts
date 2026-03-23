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

    console.log(`📩 Evolution webhook: event=${eventType}, instance=${instanceName ?? "unknown"}, keys=${Object.keys(body).join(",")}`);

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
    body.data?.qrcode?.base64 ??
    body.data?.qrcode ??
    body.qrcode?.base64 ??
    body.qrcode;

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
  const rawState: string | undefined =
    body.data?.state ?? body.state ?? body.data?.status;
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

async function handleInboundMessage(
  supabase: any,
  body: any,
  instanceName: string,
) {
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
  const remoteJidAlt: string | null =
    key.remoteJidAlt ?? msgData.remoteJidAlt ?? null;

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
          console.log(`🔧 Backfilled wa_jid=${outWaJid}, wa_phone=${outWaPhone} on conversation ${convToFix.id} (fromMe)`);
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
        await supabase
          .from("wa_messages")
          .update({ status: "delivered" })
          .eq("id", existing.id);
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

  // For phone: prefer remoteJidAlt (real number) over remoteJid (which may be a LID)
  const baseForPhone = remoteJidAlt ?? remoteJid;
  const wa_phone = baseForPhone.replace(/@.*$/, "").replace(/\D/g, "");

  console.log("EVOLUTION JIDs", { remoteJid, remoteJidAlt, wa_jid, wa_phone, isLid });

  if (wa_phone.length < 10 || wa_phone.length > 15) {
    if (isLid) {
      console.warn(`⚠️ LID sem remoteJidAlt válido. wa_phone="${wa_phone}" (${wa_phone.length} dígitos). Outbound deve ser bloqueado. remoteJid=${remoteJid}`);
      // Still proceed to create/update conversation with wa_jid so inbound messages are tracked
    } else {
      console.warn(`⚠️ Invalid phone digits from remoteJid: ${remoteJid} → "${wa_phone}" (${wa_phone.length} digits). Skipping.`);
      return;
    }
  }

  const validPhone = wa_phone.length >= 10 && wa_phone.length <= 15;

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
    // Evolution v2 may provide base64 or URL
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
  } else {
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

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabase
      .from("wa_conversations")
      .insert({
        wa_jid: wa_jid,
        wa_phone: wa_phone,
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
      })
      .select("id")
      .single();

    if (convErr) {
      console.error("❌ Error creating conversation:", convErr.message, JSON.stringify(convErr));
      return;
    }

    conversation = { id: newConv.id, unread_count: 1 };
    console.log(`🆕 Created conversation ${newConv.id} for wa_jid=${wa_jid} wa_phone=${wa_phone}`);
  } else {
    const updatePayload: any = {
      wa_jid: wa_jid,
      wa_phone: wa_phone,
      last_message_at: new Date().toISOString(),
      last_message_preview: bodyText.slice(0, 200),
      last_inbound_at: new Date().toISOString(),
      unread_count: (conversation.unread_count ?? 0) + 1,
    };

    // Update name if missing
    if (pushName && !conversation.wa_name) {
      updatePayload.wa_name = pushName;
    }

    // Reopen closed conversations
    if (conversation.status === "closed") {
      updatePayload.status = "open";
    }

    // Update instance if changed
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

  if (mediaUrl) insertPayload.media_url = mediaUrl;
  if (mediaMime) insertPayload.media_mime = mediaMime;
  if (mediaFilename) insertPayload.media_filename = mediaFilename;

  const { error: msgErr } = await supabase
    .from("wa_messages")
    .insert(insertPayload);

  if (msgErr) {
    console.error("❌ Error inserting message:", msgErr.message, JSON.stringify(msgErr));
  } else {
    console.log(`✅ Saved inbound message ${messageId} to conversation ${conversation.id}`);
  }
}
