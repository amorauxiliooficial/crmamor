import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCorsHeaders } from "../_shared/cors.ts";

let corsHeaders: Record<string, string> = {};
const GRAPH_API_VERSION = "v21.0";
const DEFAULT_TEMPLATE_NAME = "retomar_atendimento";
const DEFAULT_TEMPLATE_LANG = "pt_BR";

/** ---------- helpers ---------- */

function firstNameFrom(name?: string | null) {
  const s = (name || "").trim();
  return s ? s.split(/\s+/)[0] : "tudo bem";
}

function normalizePhone(to: string) {
  return String(to).replace(/\D/g, "");
}

function toJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build Meta template components from:
 * - template_components (Meta native format)
 * - OR variables: ["Bruno","auxílio-maternidade"]
 * - OR variables: { "1": "Bruno", "2": "auxílio-maternidade" }
 */
function resolveTemplateComponents(input: any): any[] {
  if (Array.isArray(input?.template_components)) return input.template_components;

  const v = input?.variables ?? input?.template_variables;
  if (!v) return [];

  let arr: string[] = [];

  if (Array.isArray(v)) {
    arr = v.map((x) => String(x));
  } else if (typeof v === "object") {
    // { "1": "...", "2": "..." }
    arr = Object.keys(v)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => String(v[k]));
  } else {
    arr = [String(v)];
  }

  return [
    {
      type: "body",
      parameters: arr.map((text) => ({ type: "text", text })),
    },
  ];
}

function buildRetomarTemplatePayload(args: {
  to: string;
  template_name?: string;
  template_language?: string;
  first_name?: string;
  variables?: any;
}) {
  const tName = args.template_name || DEFAULT_TEMPLATE_NAME;
  const tLang = args.template_language || DEFAULT_TEMPLATE_LANG;

  // Se vier variables (por exemplo do modal com {{1}} e {{2}}), usa isso.
  // Senão, usa first_name como {{1}}
  let components: any[] = [];
  if (args.variables) {
    components = resolveTemplateComponents({ variables: args.variables });
  } else {
    const fname = firstNameFrom(args.first_name);
    components = [{ type: "body", parameters: [{ type: "text", text: fname }] }];
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhone(args.to),
    type: "template",
    template: {
      name: tName,
      language: { code: tLang },
      components,
    },
  };
}

/**
 * Upload media file to Meta and return media_id
 */
async function uploadMediaToMeta(params: {
  mediaUrl: string;
  mediaMime: string;
  metaToken: string;
  phoneNumberId: string;
}) {
  const { mediaUrl, mediaMime, metaToken, phoneNumberId } = params;

  console.log(`⬇️ Downloading media: ${String(mediaUrl).slice(0, 120)}...`);
  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download media: ${fileRes.status} ${fileRes.statusText}`);
  }

  const blob = await fileRes.blob();

  const filename = mediaMime.includes("ogg")
    ? "audio.ogg"
    : mediaMime.includes("webm")
      ? "audio.webm"
      : mediaMime.includes("mpeg") || mediaMime.includes("mp3")
        ? "audio.mp3"
        : mediaMime.includes("aac")
          ? "audio.aac"
          : mediaMime.includes("png")
            ? "image.png"
            : mediaMime.includes("jpeg")
              ? "image.jpg"
              : "media.bin";

  const form = new FormData();
  form.append("file", new File([blob], filename, { type: mediaMime }));
  form.append("messaging_product", "whatsapp");
  form.append("type", mediaMime);

  const uploadRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${metaToken}` },
    body: form,
  });

  const uploadBody = await uploadRes.json();
  console.log(`📤 Meta upload (${uploadRes.status}):`, JSON.stringify(uploadBody).slice(0, 300));

  if (!uploadRes.ok || !uploadBody?.id) {
    const errMsg = uploadBody?.error?.message || "Unknown upload error";
    throw new Error(`Meta media upload failed (${uploadRes.status}): ${errMsg}`);
  }

  return uploadBody.id as string;
}

/** ---------- handler ---------- */

serve(async (req: Request): Promise<Response> => {
  corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // ENV
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_TOKEN") || "";

  const META_WA_TOKEN = Deno.env.get("META_WA_TOKEN");
  const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

  if (!META_WA_TOKEN || !META_PHONE_NUMBER_ID) {
    return toJson({ error: "Server misconfigured: missing Meta credentials" }, 500);
  }

  // AUTH
  const authHeader = req.headers.get("Authorization") || "";
  const apikeyHeader = req.headers.get("apikey") || "";
  const internalToken = req.headers.get("x-internal-token") || "";

  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isInternal =
    bearerToken === serviceRoleKey ||
    apikeyHeader === serviceRoleKey ||
    (internalSecret && internalToken === internalSecret);

  console.log("🔐 auth check", {
    hasAuth: !!authHeader,
    hasApikey: !!apikeyHeader,
    hasInternalToken: !!internalToken,
    internal: isInternal,
  });

  let userId: string | null = null;

  if (!isInternal) {
    if (!authHeader.startsWith("Bearer ")) {
      return toJson({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(bearerToken);
    if (claimsError || !claimsData?.claims) {
      return toJson({ error: "Unauthorized" }, 401);
    }
    userId = claimsData.claims.sub;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();

    const {
      to,
      conversation_id,
      type = "text",

      // text
      text,

      // template
      template_name,
      template_language,
      template_components,
      variables, // UI-friendly
      template_variables, // UI-friendly alias

      // media
      media_url,
      media_mime,
      media_filename,
      caption,

      // window fallback
      window_fallback_template,
      first_name,
    } = body;

    if (!to) return toJson({ error: 'Missing "to"' }, 400);

    // Detect LID (Line ID) format used by WhatsApp Web for some contacts
    const isLidContact = String(to).includes("@lid");
    const cleanPhone = isLidContact ? String(to) : normalizePhone(to);
    const msgType = String(type || "text");

    console.log(`📤 Sending ${msgType} to ${cleanPhone} (internal=${isInternal}, lid=${isLidContact})`);

    // ====== EVOLUTION API ROUTING ======
    // Check if conversation uses Evolution channel
    if (conversation_id) {
      const { data: conv } = await adminClient
        .from("wa_conversations")
        .select("active_channel_code, instance_id")
        .eq("id", conversation_id)
        .single();

      if (conv?.active_channel_code === "evolution" && conv?.instance_id) {
        const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
        const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
          return toJson({ error: "Evolution API not configured" }, 500);
        }

        // Get instance name
        const { data: instance } = await adminClient
          .from("whatsapp_instances")
          .select("evolution_instance_name, name")
          .eq("id", conv.instance_id)
          .single();

        if (!instance) {
          return toJson({ error: "WhatsApp instance not found" }, 404);
        }

        const evoBaseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");
        const instanceName = encodeURIComponent(instance.evolution_instance_name);

        let evoPayload: any = null;
        let evoEndpoint = "";

        if (msgType === "text") {
          if (!text) return toJson({ error: 'Missing "text"' }, 400);
          // For LID contacts, use the full JID; for normal phones, use cleaned number
          const evoNumber = cleanPhone.includes("@lid") ? cleanPhone : cleanPhone;
          evoEndpoint = `/message/sendText/${instanceName}`;
          evoPayload = {
            number: evoNumber,
            text: text,
          };
        } else if (msgType === "image" && media_url) {
          evoEndpoint = `/message/sendMedia/${instanceName}`;
          evoPayload = {
            number: cleanPhone,
            mediatype: "image",
            media: media_url,
            caption: caption || undefined,
          };
        } else if (msgType === "audio" && media_url) {
          evoEndpoint = `/message/sendWhatsAppAudio/${instanceName}`;
          evoPayload = {
            number: cleanPhone,
            audio: media_url,
          };
        } else if (msgType === "document" && media_url) {
          evoEndpoint = `/message/sendMedia/${instanceName}`;
          evoPayload = {
            number: cleanPhone,
            mediatype: "document",
            media: media_url,
            fileName: media_filename || "document",
            caption: caption || undefined,
          };
        } else if (msgType === "video" && media_url) {
          evoEndpoint = `/message/sendMedia/${instanceName}`;
          evoPayload = {
            number: cleanPhone,
            mediatype: "video",
            media: media_url,
            caption: caption || undefined,
          };
        }

        if (!evoPayload || !evoEndpoint) {
          return toJson({ error: `Unsupported message type for Evolution: ${msgType}` }, 400);
        }

        console.log(`📤 Evolution: ${evoEndpoint} to ${cleanPhone} via ${instance.name}`);

        const evoRes = await fetch(`${evoBaseUrl}${evoEndpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EVOLUTION_API_KEY,
            Authorization: `Bearer ${EVOLUTION_API_KEY}`,
          },
          body: JSON.stringify(evoPayload),
        });

        const evoText = await evoRes.text().catch(() => "");
        console.log(`📡 Evolution response (${evoRes.status}): ${evoText.slice(0, 500)}`);
        let evoJson: any = null;
        try {
          evoJson = evoText ? JSON.parse(evoText) : null;
        } catch {
          console.warn("⚠️ Evolution response is not JSON, treating as raw text");
        }

        if (!evoRes.ok) {
          const errMsg = typeof evoJson === "object" && evoJson?.message
            ? String(evoJson.message)
            : evoText || evoRes.statusText;

          console.error(`❌ Evolution error ${evoRes.status}: ${errMsg}`);

          // Store failed message
          const bodyText = msgType === "text" ? String(text || "") : caption || `[${msgType}]`;
          await adminClient.from("wa_messages").insert({
            conversation_id,
            direction: "out",
            body: bodyText,
            msg_type: msgType,
            status: "failed",
            sent_by: userId,
            sent_at: new Date().toISOString(),
            channel: "whatsapp_web",
            instance_id: conv.instance_id,
            error_code: String(evoRes.status),
            error_message: errMsg,
          });

          return toJson({ error: `Evolution API error: ${errMsg}` }, evoRes.status);
        }

        // Store success message
        const bodyText = msgType === "text" ? String(text || "") : caption || `[${msgType}]`;
        const evoMsgId = evoJson?.key?.id ?? null;

        console.log(`✅ Evolution sent OK. Saving to DB... msgId=${evoMsgId}, userId=${userId}`);

        const { error: insertErr } = await adminClient.from("wa_messages").insert({
          conversation_id,
          meta_message_id: evoMsgId,
          direction: "out",
          body: bodyText,
          msg_type: msgType,
          status: "sent",
          sent_by: userId,
          sent_at: new Date().toISOString(),
          channel: "whatsapp_web",
          instance_id: conv.instance_id,
          ...(media_url ? { media_url, media_mime, media_filename } : {}),
        });

        if (insertErr) {
          console.error("❌ DB insert wa_messages error:", JSON.stringify(insertErr));
        } else {
          console.log("✅ wa_messages insert OK");
        }

        const { error: updateErr } = await adminClient
          .from("wa_conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: bodyText.slice(0, 200),
          })
          .eq("id", conversation_id);

        if (updateErr) {
          console.error("❌ DB update wa_conversations error:", JSON.stringify(updateErr));
        } else {
          console.log("✅ wa_conversations update OK");
        }

        return toJson({
          success: true,
          channel: "evolution",
          instance: instance.name,
          meta_message_id: evoMsgId,
          conversation_id,
        });
      }
    }
    // ====== END EVOLUTION ROUTING ======

    // Build Meta payload
    let metaPayload: any = null;

    if (msgType === "text") {
      if (!text) return toJson({ error: 'Missing "text" for text message' }, 400);
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: text },
      };
    }

    if (msgType === "template") {
      if (!template_name) return toJson({ error: "Missing template_name for template message" }, 400);

      const components = Array.isArray(template_components)
        ? template_components
        : resolveTemplateComponents({ variables: variables ?? template_variables });

      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: {
          name: template_name,
          language: { code: template_language || DEFAULT_TEMPLATE_LANG },
          components: components || [],
        },
      };
    }

    if (msgType === "audio") {
      if (!media_url) return toJson({ error: "Missing media_url for audio" }, 400);

      let effectiveMime = media_mime || "audio/ogg";

      // compat hack
      if (String(effectiveMime).includes("webm") && String(effectiveMime).includes("opus")) {
        effectiveMime = "audio/ogg";
        console.log("🔄 Re-labeling audio/webm;codecs=opus → audio/ogg");
      }

      // Meta não aceita vários webm. Se for webm puro, falha com mensagem clara.
      if (String(effectiveMime).includes("webm") && !String(effectiveMime).includes("opus")) {
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
        return toJson({ error: "Unsupported audio format", error_code: "UNSUPPORTED_FORMAT" }, 400);
      }

      const mediaId = await uploadMediaToMeta({
        mediaUrl: media_url,
        mediaMime: effectiveMime,
        metaToken: META_WA_TOKEN,
        phoneNumberId: META_PHONE_NUMBER_ID,
      });

      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "audio",
        audio: { id: mediaId },
      };
    }

    if (msgType === "image") {
      if (!media_url) return toJson({ error: "Missing media_url for image" }, 400);
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "image",
        image: { link: media_url, caption: caption || undefined },
      };
    }

    if (msgType === "video") {
      if (!media_url) return toJson({ error: "Missing media_url for video" }, 400);
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "video",
        video: { link: media_url, caption: caption || undefined },
      };
    }

    if (msgType === "document") {
      if (!media_url) return toJson({ error: "Missing media_url for document" }, 400);
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "document",
        document: { link: media_url, filename: media_filename || "document", caption: caption || undefined },
      };
    }

    if (!metaPayload) {
      return toJson({ error: `Unsupported message type: ${msgType}` }, 400);
    }

    // Send to Meta
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

    // Handle error (including window fallback)
    if (!metaRes.ok) {
      const metaError = metaBody?.error;
      const errorCode = metaError?.code || metaRes.status;
      const isWindowError = errorCode === 131047 || metaError?.error_subcode === 131047;

      // Window fallback: if text failed and requested fallback
      if (isWindowError && msgType === "text" && window_fallback_template) {
        // Se o caller mandar `variables`, usamos elas.
        // Senão, usamos first_name como {{1}}.
        const fallbackPayload = buildRetomarTemplatePayload({
          to,
          template_name: DEFAULT_TEMPLATE_NAME,
          template_language: DEFAULT_TEMPLATE_LANG,
          first_name: first_name,
          variables: variables ?? template_variables,
        });

        console.log(
          "🧩 Window expired → sending template fallback:",
          JSON.stringify(fallbackPayload.template).slice(0, 250),
        );

        const fbRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_WA_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackPayload),
        });

        const fbBody = await fbRes.json();
        console.log(`📡 Meta API template fallback (${fbRes.status}):`, JSON.stringify(fbBody).slice(0, 300));

        if (fbRes.ok && fbBody?.messages?.[0]?.id) {
          const metaMsgId = fbBody.messages[0].id;

          if (conversation_id) {
            await adminClient.from("wa_messages").insert({
              conversation_id,
              meta_message_id: metaMsgId,
              direction: "out",
              body: `[template: ${DEFAULT_TEMPLATE_NAME}]`,
              msg_type: "template",
              status: "sent",
              sent_by: userId,
              sent_at: new Date().toISOString(),
              template_name: DEFAULT_TEMPLATE_NAME,
              template_variables: fallbackPayload.template.components,
            });

            await adminClient
              .from("wa_conversations")
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: `[template: ${DEFAULT_TEMPLATE_NAME}]`.slice(0, 200),
              })
              .eq("id", conversation_id);
          }

          return toJson({
            success: true,
            used_template_fallback: true,
            template_name: DEFAULT_TEMPLATE_NAME,
            meta_message_id: metaMsgId,
            conversation_id,
          });
        }
      }

      // Store failed message in DB (best effort)
      if (conversation_id) {
        const bodyText =
          msgType === "text"
            ? String(text || "")
            : msgType === "template"
              ? `[template: ${template_name}]`
              : caption || `[${msgType}]`;

        await adminClient.from("wa_messages").insert({
          conversation_id,
          direction: "out",
          body: bodyText,
          msg_type: msgType,
          status: "failed",
          sent_by: userId,
          sent_at: new Date().toISOString(),
          error_code: String(errorCode),
          error_message: isWindowError
            ? "Janela de 24h expirada. Use um template aprovado para retomar a conversa."
            : metaError?.message || "Erro desconhecido da Meta API",
          template_name: msgType === "template" ? template_name : null,
          template_variables:
            msgType === "template"
              ? Array.isArray(template_components)
                ? template_components
                : resolveTemplateComponents({ variables: variables ?? template_variables })
              : null,
        });
      }

      return toJson(
        {
          error: "Meta API error",
          error_message: metaError?.message || "Unknown error",
          error_code: errorCode,
          is_window_error: isWindowError,
          details: metaBody,
        },
        metaRes.status,
      );
    }

    // Success
    const metaMsgId = metaBody?.messages?.[0]?.id ?? null;
    if (!metaMsgId) {
      return toJson({ error: "Meta did not return message ID", details: metaBody }, 502);
    }

    // Store outbound message
    if (conversation_id) {
      const bodyText =
        msgType === "text"
          ? String(text || "")
          : msgType === "template"
            ? `[template: ${template_name}]`
            : caption || `[${msgType}]`;

      await adminClient.from("wa_messages").insert({
        conversation_id,
        meta_message_id: metaMsgId,
        direction: "out",
        body: bodyText,
        msg_type: msgType,
        status: "sent",
        sent_by: userId,
        sent_at: new Date().toISOString(),
        template_name: msgType === "template" ? template_name : null,
        template_variables:
          msgType === "template"
            ? Array.isArray(template_components)
              ? template_components
              : resolveTemplateComponents({ variables: variables ?? template_variables })
            : null,
      });

      await adminClient
        .from("wa_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: bodyText.slice(0, 200),
        })
        .eq("id", conversation_id);
    }

    return toJson({ success: true, meta_message_id: metaMsgId, conversation_id });
  } catch (err) {
    console.error("❌ whatsapp-send error:", err);
    return toJson({ error: "Internal server error", error_message: String(err) }, 500);
  }
});
