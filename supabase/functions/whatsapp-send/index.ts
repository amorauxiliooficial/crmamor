import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-internal-token",
    "x-supabase-client-platform",
    "x-supabase-client-platform-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
  ].join(", "),
};

const GRAPH_API_VERSION = "v21.0";
const DEFAULT_TEMPLATE_NAME = "retomar_atendimento";
const DEFAULT_TEMPLATE_LANG = "pt_BR";

function firstNameFrom(input?: string | null): string {
  const s = (input || "").trim();
  if (!s) return "tudo bem";
  return s.split(/\s+/)[0] || "tudo bem";
}

function buildRetomarTemplate(firstName: string, templateName = DEFAULT_TEMPLATE_NAME, lang = DEFAULT_TEMPLATE_LANG) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: firstName }],
        },
      ],
    },
  };
}

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

  if (!uploadRes.ok || !uploadBody?.id) {
    const errMsg = uploadBody?.error?.message || "Unknown upload error";
    throw new Error(`Meta media upload failed (${uploadRes.status}): ${errMsg}`);
  }

  return uploadBody.id;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const INTERNAL_FUNCTION_TOKEN = Deno.env.get("INTERNAL_FUNCTION_TOKEN") || "";

  const authHeader = req.headers.get("Authorization") || "";
  const apikeyHeader = req.headers.get("apikey") || "";
  const internalToken = req.headers.get("x-internal-token") || "";

  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isInternalCall =
    bearerToken === serviceRoleKey ||
    apikeyHeader === serviceRoleKey ||
    (INTERNAL_FUNCTION_TOKEN && internalToken === INTERNAL_FUNCTION_TOKEN);

  console.log("🔐 auth check", {
    hasAuth: !!authHeader,
    hasApikey: !!apikeyHeader,
    hasInternalToken: !!internalToken,
    internal: isInternalCall,
  });

  if (!isInternalCall && !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let userId: string | null = null;

  if (!isInternalCall) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(bearerToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    userId = claimsData.claims.sub;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();

    const {
      to,
      text,
      conversation_id,
      type,
      media_url,
      media_mime,
      media_filename,
      caption,

      // template
      template_name,
      template_language,
      template_components,

      // window fallback
      window_fallback_template,
      first_name,
    } = body;

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

    const cleanPhone = String(to).replace(/\D/g, "");
    const msgType = type || "text";

    console.log(`📤 Sending ${msgType} to +${cleanPhone} (internal=${isInternalCall})`);

    // Build Meta payload
    let metaPayload: Record<string, unknown>;

    if (msgType === "template") {
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
      if (!media_url)
        return new Response(JSON.stringify({ error: "Missing media_url for audio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      let effectiveMime = media_mime || "audio/ogg";
      if (effectiveMime.includes("webm") && effectiveMime.includes("opus")) effectiveMime = "audio/ogg";

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

    // Send to Meta
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload),
    });

    const metaBody = await metaRes.json();
    console.log(`📡 Meta API response (${metaRes.status}):`, JSON.stringify(metaBody).slice(0, 300));

    if (!metaRes.ok) {
      const metaError = metaBody?.error;
      const errorCode = metaError?.code || metaRes.status;
      const isWindowError = errorCode === 131047 || metaError?.error_subcode === 131047;

      // window fallback for text
      if (isWindowError && msgType === "text" && window_fallback_template) {
        const fname = firstNameFrom(first_name);
        const fallbackTemplateName = template_name || DEFAULT_TEMPLATE_NAME;
        const fallbackLang = template_language || DEFAULT_TEMPLATE_LANG;

        console.log(`🧩 Window expired. Falling back to template=${fallbackTemplateName} fname=${fname}`);

        const templatePayload = buildRetomarTemplate(fname, fallbackTemplateName, fallbackLang) as any;
        templatePayload.to = cleanPhone;

        const fbRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${META_WA_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify(templatePayload),
        });

        const fbBody = await fbRes.json();
        console.log(`📡 Meta API template fallback (${fbRes.status}):`, JSON.stringify(fbBody).slice(0, 300));

        if (fbRes.ok && fbBody?.messages?.[0]?.id) {
          const metaMsgId = fbBody.messages[0].id;

          let convoId = conversation_id;
          if (!convoId) {
            const { data: existing } = await adminClient
              .from("wa_conversations")
              .select("id")
              .eq("wa_phone", cleanPhone)
              .maybeSingle();
            if (existing?.id) convoId = existing.id;
          }

          if (convoId) {
            await adminClient.from("wa_messages").insert({
              conversation_id: convoId,
              meta_message_id: metaMsgId,
              direction: "out",
              body: `[template: ${fallbackTemplateName}]`,
              msg_type: "template",
              status: "sent",
              sent_by: userId,
              sent_at: new Date().toISOString(),
              template_name: fallbackTemplateName,
              template_variables: [{ type: "body", parameters: [{ type: "text", text: fname }] }],
            });

            await adminClient
              .from("wa_conversations")
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: `[template: ${fallbackTemplateName}]`.slice(0, 200),
              })
              .eq("id", convoId);
          }

          return new Response(
            JSON.stringify({
              success: true,
              meta_message_id: metaMsgId,
              conversation_id: convoId,
              used_template_fallback: true,
              template_name: fallbackTemplateName,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // store failed message if possible
      if (conversation_id) {
        const bodyText =
          msgType === "text"
            ? text
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
          template_variables: msgType === "template" ? template_components || null : null,
        });
      }

      return new Response(
        JSON.stringify({
          error: "Meta API error",
          error_message: metaError?.message || "Unknown error",
          error_code: errorCode,
          is_window_error: isWindowError,
          details: metaBody,
        }),
        { status: metaRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metaMsgId = metaBody?.messages?.[0]?.id ?? null;
    if (!metaMsgId) {
      return new Response(JSON.stringify({ error: "Meta did not return message ID", details: metaBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // store outbound message (best effort)
    let convoId = conversation_id;
    if (convoId) {
      const bodyText =
        msgType === "text" ? text : msgType === "template" ? `[template: ${template_name}]` : caption || `[${msgType}]`;

      await adminClient.from("wa_messages").insert({
        conversation_id: convoId,
        meta_message_id: metaMsgId,
        direction: "out",
        body: bodyText,
        msg_type: msgType,
        status: "sent",
        sent_by: userId,
        sent_at: new Date().toISOString(),
        template_name: msgType === "template" ? template_name : null,
        template_variables: msgType === "template" ? template_components || null : null,
      });

      await adminClient
        .from("wa_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: String(bodyText || "").slice(0, 200),
        })
        .eq("id", convoId);
    }

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
