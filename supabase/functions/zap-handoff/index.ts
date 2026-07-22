import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { publicCorsHeaders } from "../_shared/cors.ts";

const DEFAULT_ZAP_CARD_URL_TEMPLATE =
  "https://app.zapresponder.com.br/dashboard/crm/6a27ff28c7f1661d384e305b/card/{cardId}";

// Inline copy of src/lib/phoneUtils.ts normalizePhoneToE164BR (do NOT import from src/)
function normalizePhoneToE164BR(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return null;
  }
  return `+55${digits}`;
}

// deno-lint-ignore no-explicit-any
type AnyObj = Record<string, any>;

function getPath(obj: AnyObj | null | undefined, path: string): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as AnyObj)[key];
    return undefined;
  }, obj);
}

function firstDefined(obj: AnyObj, paths: string[]): unknown {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "sim" || s === "true" || s === "1" || s === "yes" || s === "s";
  }
  return false;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function resolveZapCardUrl(body: AnyObj, card: AnyObj, cardId: string | null): string | null {
  const payloadUrl = firstDefined(card, [
    "url",
    "link",
    "cardUrl",
    "cardURL",
    "card_url",
    "permalink",
    "shareUrl",
    "share_url",
    "links.web",
    "links.self",
  ]) ?? firstDefined(body, [
    "cardUrl",
    "cardURL",
    "card_url",
  ]);
  const normalizedPayloadUrl = normalizeHttpUrl(payloadUrl);
  if (normalizedPayloadUrl) return normalizedPayloadUrl;

  const template = Deno.env.get("ZAP_CARD_URL_TEMPLATE")?.trim() || DEFAULT_ZAP_CARD_URL_TEMPLATE;
  if (!cardId || !template.includes("{cardId}")) return null;

  return normalizeHttpUrl(template.replaceAll("{cardId}", encodeURIComponent(cardId)));
}

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const DOCUMENT_BUCKET = "documentos-clientes";

function safeFilename(value: unknown, messageType: string): string {
  const fallback = messageType === "image" ? "imagem.jpg" : "documento";
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return raw
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || fallback;
}

function isReceivedMessageEvent(eventType: string): boolean {
  return ["message.received", "message_received", "whatsapp_message_received"].includes(
    eventType.toLowerCase(),
  );
}

async function receiveZapDocument(body: AnyObj, jsonHeaders: Record<string, string>) {
  const data: AnyObj = body.data ?? body.message ?? body;
  const messageType = String(data.type ?? data.messageType ?? data.message_type ?? "").toLowerCase();
  const mediaUrl = normalizeHttpUrl(firstDefined(data, [
    "content.media.url",
    "media.url",
    "mediaUrl",
    "media_url",
    "content.url",
    "url",
  ]));

  if (!mediaUrl || !["image", "document", "file"].includes(messageType)) {
    return new Response(JSON.stringify({ ignored: true, reason: "not_a_document" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const phoneRaw = firstDefined(data, [
    "recipient.id",
    "sender.id",
    "contact.chatId",
    "contact.phone",
    "chatId",
    "phone",
  ]);
  const telefoneE164 = normalizePhoneToE164BR(typeof phoneRaw === "string" ? phoneRaw : null);
  const messageIdRaw = firstDefined(data, ["id", "messageId", "message_id"]);
  const messageId = typeof messageIdRaw === "string" ? messageIdRaw.trim() : "";

  if (!telefoneE164 || !messageId) {
    console.warn("zap-handoff: media ignored; missing phone or message id");
    return new Response(JSON.stringify({ ignored: true, reason: "missing_identity" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: duplicate } = await supabaseAdmin
    .from("mae_documentos")
    .select("id, mae_id")
    .eq("source", "ZapResponder")
    .eq("source_message_id", messageId)
    .maybeSingle();

  if (duplicate) {
    return new Response(JSON.stringify({ duplicate: true, id: duplicate.id }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const download = await fetch(mediaUrl, { redirect: "follow" });
  if (!download.ok) {
    console.error("zap-handoff: media download failed", download.status);
    return new Response(JSON.stringify({ error: "Nao foi possivel baixar o documento" }), {
      status: 502,
      headers: jsonHeaders,
    });
  }

  const declaredSize = Number(download.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_DOCUMENT_BYTES) {
    return new Response(JSON.stringify({ error: "Documento maior que 20 MB" }), {
      status: 413,
      headers: jsonHeaders,
    });
  }

  const bytes = new Uint8Array(await download.arrayBuffer());
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return new Response(JSON.stringify({ error: "Documento maior que 20 MB" }), {
      status: 413,
      headers: jsonHeaders,
    });
  }

  const mimeType = String(
    firstDefined(data, ["content.media.mime_type", "content.media.mimetype", "mime_type", "mimetype"]) ??
      download.headers.get("content-type") ??
      (messageType === "image" ? "image/jpeg" : "application/octet-stream"),
  ).split(";")[0].trim();
  const filename = safeFilename(
    firstDefined(data, [
      "content.media.fileName",
      "content.media.filename",
      "content.fileName",
      "filename",
      "fileName",
    ]),
    messageType,
  );
  const phonePath = telefoneE164.replace(/\D/g, "");
  const storagePath = `zap/${phonePath}/${new Date().toISOString().slice(0, 10)}/${safeFilename(messageId, "document")}-${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) {
    console.error("zap-handoff: storage upload failed", uploadError.message);
    return new Response(JSON.stringify({ error: "Erro ao armazenar documento" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const { data: mae } = await supabaseAdmin
    .from("mae_processo")
    .select("id")
    .eq("telefone_e164", telefoneE164)
    .eq("contrato_assinado", true)
    .limit(1)
    .maybeSingle();

  const receivedAtRaw = firstDefined(data, ["sent_at", "created_at"]);
  const receivedAt = typeof receivedAtRaw === "string" && !Number.isNaN(Date.parse(receivedAtRaw))
    ? new Date(receivedAtRaw).toISOString()
    : null;

  const { data: documentRow, error: insertError } = await supabaseAdmin
    .from("mae_documentos")
    .insert({
      mae_id: mae?.id ?? null,
      telefone_e164: telefoneE164,
      source: "ZapResponder",
      source_message_id: messageId,
      nome_arquivo: filename,
      mime_type: mimeType,
      tamanho_bytes: bytes.byteLength,
      storage_path: storagePath,
      received_at: receivedAt,
    })
    .select("id, mae_id")
    .single();

  if (insertError) {
    await supabaseAdmin.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    console.error("zap-handoff: document insert failed", insertError.message);
    return new Response(JSON.stringify({ error: "Erro ao registrar documento" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  console.log("zap-handoff: document stored", {
    id: documentRow.id,
    linked: documentRow.mae_id !== null,
    messageType,
    size: bytes.byteLength,
  });
  return new Response(JSON.stringify({
    success: true,
    document_id: documentRow.id,
    linked: documentRow.mae_id !== null,
  }), { status: 200, headers: jsonHeaders });
}

function filenameFromMediaUrl(mediaUrl: string): string | null {
  try {
    const pathname = new URL(mediaUrl).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).at(-1);
    return lastSegment ? decodeURIComponent(lastSegment) : null;
  } catch {
    return null;
  }
}

async function syncZapConversationHistory(telefoneE164: string, maeId: string): Promise<void> {
  const apiToken = Deno.env.get("ZAP_API_TOKEN")?.trim();
  if (!apiToken) {
    console.warn("zap-handoff: ZAP_API_TOKEN missing; history sync skipped");
    return;
  }

  const phone = telefoneE164.replace(/\D/g, "");
  const apiBase = "https://api.zapresponder.com.br/api";
  const apiHeaders = { Authorization: `Bearer ${apiToken}`, Accept: "application/json" };

  const conversationResponse = await fetch(
    `${apiBase}/v2/conversations/chatId/${encodeURIComponent(phone)}?includeClosed=true`,
    { headers: apiHeaders },
  );
  if (!conversationResponse.ok) {
    console.error("zap-handoff: conversation history lookup failed", conversationResponse.status);
    return;
  }

  const conversationPayload: AnyObj = await conversationResponse.json();
  const conversation = conversationPayload.conversation ?? conversationPayload.data ?? conversationPayload;
  const conversationId = typeof conversation?._id === "string"
    ? conversation._id
    : typeof conversation?.id === "string"
    ? conversation.id
    : null;
  if (!conversationId) {
    console.warn("zap-handoff: no conversation found for history sync");
    return;
  }

  const messages: AnyObj[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  do {
    const messagesUrl = new URL(`${apiBase}/v2/conversations/${encodeURIComponent(conversationId)}/messages`);
    if (cursor) messagesUrl.searchParams.set("cursor", cursor);

    const pageResponse = await fetch(messagesUrl, { headers: apiHeaders });
    if (!pageResponse.ok) {
      console.error("zap-handoff: conversation messages lookup failed", pageResponse.status);
      break;
    }

    const page: AnyObj = await pageResponse.json();
    if (Array.isArray(page.messages)) messages.push(...page.messages);
    cursor = typeof page.nextCursor === "string" && page.nextCursor ? page.nextCursor : null;
    pageCount += 1;
  } while (cursor && pageCount < 100);

  const mediaMessages = messages.flatMap((message) => {
    const content = message?.mensagem ?? {};
    if (String(content.type ?? "").toLowerCase() !== "file") return [];

    const mediaUrl = normalizeHttpUrl(content.mensagem);
    const messageId = typeof message?._id === "string" ? message._id.trim() : "";
    if (!mediaUrl || !messageId) return [];

    return [{
      mediaUrl,
      messageId,
      filename: filenameFromMediaUrl(mediaUrl),
      receivedAt: typeof message.createdAt === "string" ? message.createdAt : null,
    }];
  });

  let stored = 0;
  let duplicates = 0;
  let failed = 0;
  for (let index = 0; index < mediaMessages.length; index += 4) {
    const batch = mediaMessages.slice(index, index + 4);
    const results = await Promise.all(batch.map(async (media) => {
      try {
        const response = await receiveZapDocument({
          type: "message.received",
          data: {
            id: media.messageId,
            type: "file",
            created_at: media.receivedAt,
            recipient: { id: phone },
            content: { media: { url: media.mediaUrl, filename: media.filename } },
          },
        }, { "Content-Type": "application/json" });
        const result: AnyObj = await response.json();
        if (result.success) return "stored";
        if (result.duplicate) return "duplicate";
        return "failed";
      } catch (error) {
        console.error(
          "zap-handoff: history document import failed",
          error instanceof Error ? error.message : String(error),
        );
        return "failed";
      }
    }));

    stored += results.filter((result) => result === "stored").length;
    duplicates += results.filter((result) => result === "duplicate").length;
    failed += results.filter((result) => result === "failed").length;
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { error: linkError } = await supabaseAdmin
    .from("mae_documentos")
    .update({ mae_id: maeId })
    .eq("telefone_e164", telefoneE164)
    .is("mae_id", null);
  if (linkError) console.error("zap-handoff: failed to link imported documents", linkError.message);

  console.log("zap-handoff: conversation history sync completed", {
    pages: pageCount,
    messages: messages.length,
    media: mediaMessages.length,
    stored,
    duplicates,
    failed,
  });
}

function queueZapConversationHistorySync(telefoneE164: string | null, maeId: string): void {
  if (!telefoneE164) return;

  const task = syncZapConversationHistory(telefoneE164, maeId).catch((error) => {
    console.error(
      "zap-handoff: conversation history sync failed",
      error instanceof Error ? error.message : String(error),
    );
  });
  const edgeRuntime = (globalThis as AnyObj).EdgeRuntime;
  if (edgeRuntime && typeof edgeRuntime.waitUntil === "function") {
    edgeRuntime.waitUntil(task);
  }
}

serve(async (req) => {
  const corsHeaders = publicCorsHeaders();
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Security: secret via header or query param (same pattern as evolution-webhook)
    const url = new URL(req.url);
    const expectedSecret = Deno.env.get("ZAP_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");
    if (expectedSecret && receivedSecret !== expectedSecret) {
      console.warn("zap-handoff: invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const body: AnyObj = await req.json();
    const eventType = typeof body.type === "string" ? body.type : typeof body.event === "string" ? body.event : "";

    if (isReceivedMessageEvent(eventType)) {
      return await receiveZapDocument(body, jsonHeaders);
    }

    // Event type guard
    if (body.type && body.type !== "crm_card_moved") {
      console.log("zap-handoff: ignored, type =", body.type);
      return new Response(JSON.stringify({ ignored: true, reason: "event_type" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const card: AnyObj = body.card ?? {};

    // Stage filter: only proceed if stage contains "contrato fechado" (case-insensitive)
    const stageName = typeof card.stage?.name === "string" ? card.stage.name : "";
    if (!stageName.toLowerCase().includes("contrato fechado")) {
      console.log("zap-handoff: ignored, stage =", stageName);
      return new Response(JSON.stringify({ ignored: true, reason: "stage_not_contrato_fechado" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const cardId = typeof card.cardId === "string" ? card.cardId.trim() : null;
    const cardUrl = resolveZapCardUrl(body, card, cardId);
    console.log("zap-handoff: event received", {
      type: body.type ?? "unknown",
      cardId,
      hasCardUrl: cardUrl !== null,
    });

    const contacts = Array.isArray(card.contacts) ? card.contacts : [];
    const contact: AnyObj = contacts[0] ?? {};

    const title = typeof card.title === "string" ? card.title.trim() : "";
    const name = title || (typeof contact.name === "string" ? contact.name.trim() : "");

    const phone = typeof contact.chatId === "string" ? contact.chatId.trim() : "";

    const emailRaw = typeof contact.email === "string" ? contact.email.trim() : null;
    const email = emailRaw && emailRaw.length > 0 ? emailRaw : null;

    const ZAP_FIELD_CPF = "6a2ca27150034cd0193fc5a2";
    const ZAP_FIELD_SENHA_GOV = "6a2ca23a50034cd0193fc0de";
    const ZAP_FIELD_MES_GESTACAO = "6a2ca2c98bf457bc11b8b6f8";

    const additionalFields: AnyObj = card.additionalFields ?? {};
    console.log("zap-handoff: additional field keys", Object.keys(additionalFields));

    const cpfRaw = additionalFields[ZAP_FIELD_CPF];
    const cpfDigits = cpfRaw !== undefined ? String(cpfRaw).replace(/\D/g, "") : "";
    const cpf: string | null = cpfDigits.length === 11 ? cpfDigits : null;

    const senhaGovRaw = additionalFields[ZAP_FIELD_SENHA_GOV];
    const senhaGov = senhaGovRaw !== undefined ? String(senhaGovRaw).trim() : null;

    const valorRaw = firstDefined(additionalFields, ["valor", "value"]);
    const valor = valorRaw !== undefined ? toNumber(valorRaw) : null;

    const mesGestacaoRaw = additionalFields[ZAP_FIELD_MES_GESTACAO];
    const mesGestacaoNum = mesGestacaoRaw !== undefined ? toNumber(mesGestacaoRaw) : null;
    const mesGestacao = mesGestacaoNum !== null && mesGestacaoNum >= 1 && mesGestacaoNum <= 10 ? Math.round(mesGestacaoNum) : null;

    const isGestante = mesGestacao !== null;

    // Etiqueta: extrai do payload (tags do card ou campo "etiqueta"/"tag" em additionalFields)
    let etiqueta: string | null = null;
    const rawTags = card.tags ?? card.labels ?? card.etiquetas;
    if (Array.isArray(rawTags) && rawTags.length > 0) {
      etiqueta = rawTags
        .map((t: any) => (typeof t === "string" ? t : t?.name ?? t?.label ?? t?.title))
        .filter((s: any) => typeof s === "string" && s.trim().length > 0)
        .join(", ") || null;
    } else if (typeof rawTags === "string" && rawTags.trim()) {
      etiqueta = rawTags.trim();
    }
    if (!etiqueta) {
      const fromFields = firstDefined(additionalFields, ["etiqueta", "Etiqueta", "tag", "Tag", "label"]);
      if (typeof fromFields === "string" && fromFields.trim()) {
        etiqueta = fromFields.trim();
      } else if (Array.isArray(fromFields) && fromFields.length > 0) {
        etiqueta = fromFields
          .map((t: any) => (typeof t === "string" ? t : t?.name ?? t?.label))
          .filter((s: any) => typeof s === "string" && s.trim().length > 0)
          .join(", ") || null;
      }
    }
    console.log("ZAP etiqueta extraída:", etiqueta);

    if (!name) {
      console.error("zap-handoff: missing name in payload");
      return new Response(JSON.stringify({ error: "Nome não encontrado no payload" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const telefoneE164 = normalizePhoneToE164BR(phone);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // System user: first admin from user_roles (same as public-indicacao)
    const { data: adminUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    const systemUserId = adminUsers?.[0]?.user_id;
    if (!systemUserId) {
      console.error("zap-handoff: no admin user found for system attribution");
      return new Response(JSON.stringify({ error: "Sistema não configurado corretamente" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    // Deduplication
    if (cardId) {
      const { data: existing } = await supabaseAdmin
        .from("mae_processo")
        .select("id, link_documentos")
        .eq("zap_card_id", cardId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        if (cardUrl && existing.link_documentos !== cardUrl) {
          const { error: linkError } = await supabaseAdmin
            .from("mae_processo")
            .update({ link_documentos: cardUrl })
            .eq("id", existing.id);
          if (linkError) {
            console.error("zap-handoff: failed to update card link", linkError.message);
          }
        }
        if (telefoneE164) {
          const { error: documentsError } = await supabaseAdmin
            .from("mae_documentos")
            .update({ mae_id: existing.id })
            .eq("telefone_e164", telefoneE164)
            .is("mae_id", null);
          if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
        }
        queueZapConversationHistorySync(telefoneE164, existing.id);
        console.log("zap-handoff: duplicate by zap_card_id", cardId, existing.id);
        return new Response(
          JSON.stringify({ duplicate: true, id: existing.id, card_linked: cardUrl !== null }),
          { status: 200, headers: jsonHeaders },
        );
      }
    }

    if (telefoneE164) {
      const { data: existing } = await supabaseAdmin
        .from("mae_processo")
        .select("id, zap_card_id, link_documentos")
        .eq("telefone_e164", telefoneE164)
        .limit(1)
        .maybeSingle();
      if (existing) {
        const updates: Record<string, string> = {};
        if (cardUrl && existing.link_documentos !== cardUrl) updates.link_documentos = cardUrl;
        if (cardId && !existing.zap_card_id) updates.zap_card_id = cardId;
        if (Object.keys(updates).length > 0) {
          const { error: linkError } = await supabaseAdmin
            .from("mae_processo")
            .update(updates)
            .eq("id", existing.id);
          if (linkError) {
            console.error("zap-handoff: failed to link existing record", linkError.message);
          }
        }
        const { error: documentsError } = await supabaseAdmin
          .from("mae_documentos")
          .update({ mae_id: existing.id })
          .eq("telefone_e164", telefoneE164)
          .is("mae_id", null);
        if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
        queueZapConversationHistorySync(telefoneE164, existing.id);
        console.log("zap-handoff: duplicate by telefone_e164", telefoneE164, existing.id);
        return new Response(
          JSON.stringify({ duplicate: true, id: existing.id, card_linked: cardUrl !== null }),
          { status: 200, headers: jsonHeaders },
        );
      }
    }

    const observacoes = valor !== null
      ? `Honorário (via Zap Responder): R$ ${valor}`
      : null;

    const { data: newMae, error: insertError } = await supabaseAdmin
      .from("mae_processo")
      .insert({
        nome_mae: name,
        email,
        telefone: phone,
        telefone_e164: telefoneE164,
        cpf,
        senha_gov: senhaGov,
        is_gestante: isGestante,
        mes_gestacao: mesGestacao,
        categoria_previdenciaria: "Não informado",
        status_processo: isGestante && mesGestacao !== null && mesGestacao <= 8
          ? "Gestantes 1 a 8 meses"
          : "Entradas do Mês",
        tipo_evento: "Parto",
        contrato_assinado: true,
        verificacao_duas_etapas: false,
        precisa_das: false,
        das_concluido: false,
        origem: "Zap Responder",
        etiqueta,
        observacoes,
        zap_card_id: cardId,
        link_documentos: cardUrl,
        user_id: systemUserId,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        console.log("zap-handoff: duplicate via unique index", cardId);
        return new Response(JSON.stringify({ duplicate: true }), {
          status: 200,
          headers: jsonHeaders,
        });
      }
      console.error("zap-handoff: insert error", insertError);
      return new Response(JSON.stringify({ error: "Erro ao cadastrar mãe" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const incomplete = cpf === null || senhaGov === null;
    if (telefoneE164) {
      const { error: documentsError } = await supabaseAdmin
        .from("mae_documentos")
        .update({ mae_id: newMae.id })
        .eq("telefone_e164", telefoneE164)
        .is("mae_id", null);
      if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
    }
    queueZapConversationHistorySync(telefoneE164, newMae.id);
    console.log("zap-handoff: created mae_processo", newMae.id, "incomplete:", incomplete);

    return new Response(JSON.stringify({
      success: true,
      id: newMae.id,
      incomplete,
      card_linked: cardUrl !== null,
    }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("zap-handoff: unexpected error", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
