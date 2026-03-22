import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req: Request): Promise<Response> => {
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

  // For outgoing messages, update status if we have a matching record
  if (fromMe) {
    console.log(`⏭️ Outgoing message ${messageId} — checking for status update`);
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

  // Detect LID (Line ID) format: 163122874683622@lid
  const isLid = remoteJid.includes("@lid");
  const phone = remoteJid.replace(/@.*$/, "");
  if (!phone || phone.length < 8) {
    console.warn(`⚠️ Invalid phone from remoteJid: ${remoteJid}`);
    return;
  }

  // For LID contacts, store the full JID so we can use it to send messages back
  const storedPhone = isLid ? remoteJid : phone;
  console.log(`📱 Contact: ${storedPhone} (isLid=${isLid})`);

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

  console.log(`📨 Inbound from ${storedPhone} via ${instanceName}: ${msgType} — "${bodyText.slice(0, 60)}"`);

  // Get instance ID
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("id")
    .eq("evolution_instance_name", instanceName)
    .single();

  const instanceId: string | null = instance?.id ?? null;

  // Find existing conversation by phone (try multiple formats)
  const phoneVariants = isLid
    ? [storedPhone, phone] // LID: try full JID first, then raw number
    : [phone, `+${phone}`]; // Normal phone: try raw, then with +
  let conversation: any = null;

  for (const pv of phoneVariants) {
    const { data } = await supabase
      .from("wa_conversations")
      .select("id, status, wa_name, unread_count")
      .eq("wa_phone", pv)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      conversation = data;
      break;
    }
  }

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabase
      .from("wa_conversations")
      .insert({
        wa_phone: storedPhone,
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
    console.log(`🆕 Created conversation ${newConv.id} for ${storedPhone}`);
  } else {
    const updatePayload: any = {
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

    console.log(`📝 Updated conversation ${conversation.id}`);
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
