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

function phoneCandidatesBR(phone: string | null): string[] {
  const normalized = normalizePhoneToE164BR(phone);
  if (!normalized) return [];

  const national = normalized.slice(3);
  const candidates = new Set([normalized]);

  // Telefones brasileiros podem aparecer no WhatsApp/ZapResponder com ou sem
  // o nono dígito, dependendo da origem e da idade da conversa.
  if (national.length === 11 && national[2] === "9") {
    candidates.add(`+55${national.slice(0, 2)}${national.slice(3)}`);
  } else if (national.length === 10) {
    candidates.add(`+55${national.slice(0, 2)}9${national.slice(2)}`);
  }

  return [...candidates];
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

function toOptionalBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  return null;
}

// Normaliza rótulos: remove acentos, pontuação e espaços -> "maeunica"
function normalizeKeyLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const MAE_UNICA_KEYS = ["maeunica", "maeunicaq", "eumaeunica", "souemaeunica"];

// Procura o valor de "Mãe única" em objetos, arrays de custom fields
// ({name/label/title/key} + {value/valor/answer/response}) e chaves diretas.
function findMaeUnicaValue(node: unknown, depth = 0): unknown {
  if (node === null || node === undefined || depth > 4) return undefined;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findMaeUnicaValue(item, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (typeof node !== "object") return undefined;

  const obj = node as AnyObj;

  // Formato { name/label/key: "Mãe única", value: "Sim" }
  const labelCandidate = obj.name ?? obj.label ?? obj.title ?? obj.key ?? obj.field ?? obj.campo;
  if (labelCandidate !== undefined && MAE_UNICA_KEYS.includes(normalizeKeyLabel(labelCandidate))) {
    const raw = obj.value ?? obj.valor ?? obj.answer ?? obj.resposta ?? obj.text ?? obj.selected;
    if (raw !== undefined) return raw;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (MAE_UNICA_KEYS.includes(normalizeKeyLabel(key))) return value;
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findMaeUnicaValue(value, depth + 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function extractMaeUnica(card: AnyObj, additionalFields: AnyObj): boolean | null {
  const sources = [
    additionalFields,
    card.customFields,
    card.custom_fields,
    card.fields,
    card.campos,
    card,
  ];
  for (const source of sources) {
    const raw = findMaeUnicaValue(source);
    if (raw === undefined) continue;
    const parsed = toOptionalBool(
      typeof raw === "object" && raw !== null
        ? ((raw as AnyObj).value ?? (raw as AnyObj).label ?? (raw as AnyObj).name)
        : raw,
    );
    if (parsed !== null) return parsed;
  }
  return null;
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
const DISALLOWED_MEDIA_EXTENSIONS = new Set([
  "aac", "amr", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "wma",
  "3gp", "avi", "mkv", "mov", "mp4", "mpeg", "mpg", "webm",
]);

function isDisallowedMedia(filename: string, mimeType?: string | null): boolean {
  const normalizedMime = (mimeType ?? "").toLowerCase();
  if (normalizedMime.startsWith("audio/") || normalizedMime.startsWith("video/")) return true;

  const extension = filename.toLowerCase().split(".").pop();
  return Boolean(extension && DISALLOWED_MEDIA_EXTENSIONS.has(extension));
}

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

type HistoryMessageOrigin = "customer" | "operation" | "unknown";

function getHistoryMessageOrigin(
  message: AnyObj,
  telefoneCandidates: string[],
): HistoryMessageOrigin {
  const fullMessageSender = firstDefined(message, ["full_message.from"]);
  const fullMessageSenderPhone = normalizePhoneToE164BR(
    typeof fullMessageSender === "string" ? fullMessageSender : null,
  );
  if (fullMessageSenderPhone) {
    return telefoneCandidates.includes(fullMessageSenderPhone) ? "customer" : "operation";
  }

  const authorRaw = firstDefined(message, ["autor", "author"]);
  if (typeof authorRaw === "string") {
    const author = authorRaw.trim().toLowerCase();
    if (["usuario", "user"].includes(author)) return "customer";
    if (["mobile", "atendente", "attendant"].includes(author)) return "operation";
  }

  const fromMe = toOptionalBool(firstDefined(message, [
    "isFromMe",
    "isMine",
    "mine",
    "fromMe",
    "from_me",
    "sentByMe",
    "sent_by_me",
    "mensagem.isFromMe",
    "mensagem.isMine",
    "mensagem.mine",
    "mensagem.fromMe",
    "mensagem.from_me",
  ]));
  if (fromMe !== null) return fromMe ? "operation" : "customer";

  const directionRaw = firstDefined(message, [
    "direction",
    "messageDirection",
    "message_direction",
    "origem",
    "origin",
  ]);
  if (typeof directionRaw === "string") {
    const direction = directionRaw.trim().toLowerCase();
    if (["in", "incoming", "inbound", "received", "recebida", "cliente", "contact"].includes(direction)) {
      return "customer";
    }
    if (["out", "outgoing", "outbound", "sent", "enviada", "operacao", "operação", "attendant"].includes(direction)) {
      return "operation";
    }
  }

  const senderRaw = firstDefined(message, [
    "sender.id",
    "sender.phone",
    "senderId",
    "sender_id",
    "from",
    "from.id",
    "contact.phone",
  ]);
  const senderPhone = normalizePhoneToE164BR(typeof senderRaw === "string" ? senderRaw : null);
  if (!senderPhone) return "unknown";
  return telefoneCandidates.includes(senderPhone) ? "customer" : "operation";
}

async function removeStoredOperationDocuments(messageIds: string[]): Promise<number> {
  const uniqueIds = [...new Set(messageIds.filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  let removed = 0;

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100);
    const { data: rows, error: selectError } = await supabaseAdmin
      .from("mae_documentos")
      .select("id, storage_path")
      .eq("source", "ZapResponder")
      .in("source_message_id", batch);
    if (selectError) {
      console.error("zap-handoff: operation document lookup failed", selectError.message);
      continue;
    }
    if (!rows?.length) continue;

    const { error: storageError } = await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .remove(rows.map((row) => row.storage_path));
    if (storageError) {
      console.error("zap-handoff: operation document storage cleanup failed", storageError.message);
      continue;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("mae_documentos")
      .delete()
      .in("id", rows.map((row) => row.id));
    if (deleteError) {
      console.error("zap-handoff: operation document row cleanup failed", deleteError.message);
      continue;
    }
    removed += rows.length;
  }

  return removed;
}

async function receiveZapDocument(body: AnyObj, jsonHeaders: Record<string, string>) {
  const data: AnyObj = body.data ?? body.message ?? body;
  const messageType = String(data.type ?? data.messageType ?? data.message_type ?? "").toLowerCase();
  const fromMe = toOptionalBool(firstDefined(data, [
    "isFromMe", "isMine", "mine", "fromMe", "from_me", "sentByMe", "sent_by_me",
  ]));
  if (fromMe === true) {
    return new Response(JSON.stringify({ ignored: true, reason: "sent_by_operation" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }
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
  if (isDisallowedMedia(filename)) {
    return new Response(JSON.stringify({ ignored: true, reason: "audio_or_video" }), {
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
  const telefoneCandidates = phoneCandidatesBR(telefoneE164);
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

  const mimeType = String(
    firstDefined(data, ["content.media.mime_type", "content.media.mimetype", "mime_type", "mimetype"]) ??
      download.headers.get("content-type") ??
      (messageType === "image" ? "image/jpeg" : "application/octet-stream"),
  ).split(";")[0].trim();
  if (isDisallowedMedia(filename, mimeType)) {
    return new Response(JSON.stringify({ ignored: true, reason: "audio_or_video" }), {
      status: 200,
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
    .in("telefone_e164", telefoneCandidates)
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

type HistorySyncResult = "complete" | "empty" | "unavailable" | "partial";
const DOCUMENT_SYNC_RETRY_MINUTES = [5, 15, 60, 360, 1_440, 1_440, 1_440, 1_440];
// Jobs concluídos podem ser revalidados depois de 1 hora.
const DOCUMENT_SYNC_REVALIDATE_MINUTES = 60;

async function enqueueAutomaticDocumentSync(
  maeId: string,
  telefoneE164: string | null,
  triggerImmediate = true,
): Promise<void> {
  if (!telefoneE164) return;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { error } = await supabaseAdmin
    .from("zap_document_sync_jobs")
    .upsert({
      mae_id: maeId,
      telefone_e164: telefoneE164,
      status: "pending",
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mae_id" });

  if (error) {
    console.error("zap-handoff: failed to enqueue automatic document sync", error.message);
    return;
  }

  if (triggerImmediate) {
    // Dispara o worker apontando para ESTA mãe, garantindo que o job recém-criado
    // seja processado de imediato (e não fique atrás de outros na fila).
    queueImmediateDocumentWorker(maeId);
  }
}

function queueImmediateDocumentWorker(maeId?: string): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const internalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN")?.trim();
  if (!supabaseUrl || !internalToken) {
    console.warn("zap-handoff: immediate document worker not configured");
    return;
  }

  const target = maeId
    ? `${supabaseUrl}/functions/v1/zap-handoff?mode=sync_pending_documents&mae_id=${encodeURIComponent(maeId)}`
    : `${supabaseUrl}/functions/v1/zap-document-sync`;

  const task = fetch(target, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${internalToken}`,
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error("zap-handoff: immediate document worker failed", {
          status: response.status,
          body: (await response.text()).slice(0, 500),
        });
        return;
      }
      console.log("zap-handoff: immediate document worker started");
    })
    .catch((error) => {
      console.error(
        "zap-handoff: immediate document worker unavailable",
        error instanceof Error ? error.message : String(error),
      );
    });

  const edgeRuntime = (globalThis as AnyObj).EdgeRuntime;
  if (edgeRuntime && typeof edgeRuntime.waitUntil === "function") {
    edgeRuntime.waitUntil(task);
  }
}

async function syncZapConversationHistory(
  telefoneE164: string,
  maeId: string,
): Promise<HistorySyncResult> {
  const apiToken = Deno.env.get("ZAP_API_TOKEN")?.trim();
  if (!apiToken) {
    console.warn("zap-handoff: ZAP_API_TOKEN missing; history sync skipped");
    return "unavailable";
  }

  const telefoneCandidates = phoneCandidatesBR(telefoneE164);
  const apiBase = "https://api.zapresponder.com.br/api";
  const apiHeaders = { Authorization: `Bearer ${apiToken}`, Accept: "application/json" };

  let conversation: AnyObj | null = null;
  let matchedPhone: string | null = null;
  for (const candidate of telefoneCandidates) {
    const phone = candidate.replace(/\D/g, "");
    const conversationResponse = await fetch(
      `${apiBase}/v2/conversations/chatId/${encodeURIComponent(phone)}?includeClosed=true`,
      { headers: apiHeaders },
    );
    if (!conversationResponse.ok) {
      console.error("zap-handoff: conversation history lookup failed", {
        phoneSuffix: phone.slice(-4),
        status: conversationResponse.status,
      });
      continue;
    }

    const conversationPayload: AnyObj = await conversationResponse.json();
    const candidateConversation =
      conversationPayload.conversation ?? conversationPayload.data ?? conversationPayload;
    const candidateId = typeof candidateConversation?._id === "string"
      ? candidateConversation._id
      : typeof candidateConversation?.id === "string"
      ? candidateConversation.id
      : null;
    if (candidateId) {
      conversation = candidateConversation;
      matchedPhone = candidate;
      break;
    }
  }

  if (!conversation) {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: mae, error: maeError } = await supabaseAdmin
      .from("mae_processo")
      .select("zap_card_id")
      .eq("id", maeId)
      .maybeSingle();
    if (maeError) {
      console.error("zap-handoff: card lookup for history sync failed", maeError.message);
    }

    const cardId = typeof mae?.zap_card_id === "string" ? mae.zap_card_id.trim() : "";
    if (cardId) {
      const cardResponse = await fetch(
        `${apiBase}/v2/crm/cards/${encodeURIComponent(cardId)}`,
        { headers: apiHeaders },
      );
      if (cardResponse.ok) {
        const cardPayload: AnyObj = await cardResponse.json();
        const card = cardPayload.card ?? cardPayload.data ?? cardPayload;
        const conversations = Array.isArray(card?.conversations) ? card.conversations : [];
        const cardConversation = conversations.find((item: unknown) => {
          if (!item || typeof item !== "object") return false;
          const candidate = item as AnyObj;
          return typeof candidate._id === "string" || typeof candidate.id === "string";
        });
        if (cardConversation) {
          conversation = cardConversation;
          const chatId = typeof cardConversation.chatId === "string"
            ? cardConversation.chatId
            : telefoneE164;
          matchedPhone = normalizePhoneToE164BR(chatId) ?? telefoneE164;
          console.log("zap-handoff: conversation resolved from CRM card", {
            cardIdSuffix: cardId.slice(-4),
            phoneSuffix: matchedPhone.slice(-4),
          });
        }
      } else {
        console.error("zap-handoff: CRM card lookup failed", {
          cardIdSuffix: cardId.slice(-4),
          status: cardResponse.status,
        });
      }
    }
  }

  const conversationId = typeof conversation?._id === "string"
    ? conversation._id
    : typeof conversation?.id === "string"
    ? conversation.id
    : null;
  if (!conversationId) {
    console.warn("zap-handoff: no conversation found for history sync", {
      candidates: telefoneCandidates.map((candidate) => candidate.slice(-4)),
    });
    return "empty";
  }

  const pickArray = (payload: AnyObj): AnyObj[] => {
    const candidates = [
      payload?.messages,
      payload?.data,
      payload?.items,
      payload?.results,
      payload?.docs,
      payload?.records,
      payload?.data?.messages,
      payload,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as AnyObj[];
    }
    return [];
  };

  const pickCursor = (payload: AnyObj): string | null => {
    const candidates = [
      payload?.nextCursor,
      payload?.next_cursor,
      payload?.cursor,
      payload?.paging?.next,
      payload?.pagination?.nextCursor,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return null;
  };

  const messageIdOf = (message: AnyObj): string => {
    const candidates = [
      message?._id,
      message?.id,
      message?.messageId,
      message?.message_id,
      message?.key?.id,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return "";
  };

  const contentOf = (message: AnyObj): AnyObj => {
    const content = message?.mensagem ?? message?.message ?? message?.content ?? {};
    return content && typeof content === "object" ? content as AnyObj : {};
  };

  const isFileMessage = (message: AnyObj): boolean => {
    const content = contentOf(message);
    const type = String(content?.type ?? message?.type ?? "").toLowerCase();
    if (["file", "document", "image", "audio", "video", "media"].includes(type)) return true;
    return Boolean(mediaUrlOf(message));
  };

  function mediaUrlOf(message: AnyObj): string | null {
    const content = contentOf(message);
    const candidates = [
      content?.mensagem,
      content?.url,
      content?.mediaUrl,
      content?.media_url,
      content?.fileUrl,
      content?.file_url,
      content?.media?.url,
      message?.mediaUrl,
      message?.url,
    ];
    for (const candidate of candidates) {
      const normalized = typeof candidate === "string" ? normalizeHttpUrl(candidate) : null;
      if (normalized) return normalized;
    }
    return null;
  }

  const messages: AnyObj[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let messagesUnavailable = false;
  do {
    const messagesUrl = new URL(`${apiBase}/v2/conversations/${encodeURIComponent(conversationId)}/messages`);
    if (cursor) messagesUrl.searchParams.set("cursor", cursor);

    const pageResponse = await fetch(messagesUrl, { headers: apiHeaders });
    if (!pageResponse.ok) {
      console.error("zap-handoff: conversation messages lookup failed", pageResponse.status);
      if (pageCount === 0) messagesUnavailable = true;
      break;
    }

    let page: AnyObj = {};
    try {
      page = await pageResponse.json();
    } catch (error) {
      console.error(
        "zap-handoff: conversation messages payload invalid",
        error instanceof Error ? error.message : String(error),
      );
      if (pageCount === 0) messagesUnavailable = true;
      break;
    }

    messages.push(...pickArray(page));
    cursor = pickCursor(page);
    pageCount += 1;
  } while (cursor && pageCount < 100);

  if (messagesUnavailable) {
    return "unavailable";
  }

  const operationMessageIds = messages.flatMap((message) => {
    if (getHistoryMessageOrigin(message, telefoneCandidates) !== "operation") return [];
    if (!isFileMessage(message)) return [];
    const messageId = messageIdOf(message);
    return messageId ? [messageId] : [];
  });
  const removedOperationDocuments = await removeStoredOperationDocuments(operationMessageIds);

  const mediaMessages = messages.flatMap((message) => {
    if (getHistoryMessageOrigin(message, telefoneCandidates) !== "customer") return [];
    if (!isFileMessage(message)) return [];

    const mediaUrl = mediaUrlOf(message);
    const messageId = messageIdOf(message);
    if (!mediaUrl || !messageId) return [];

    const content = contentOf(message);
    const filename = (typeof content?.filename === "string" && content.filename.trim())
      ? content.filename.trim()
      : filenameFromMediaUrl(mediaUrl);
    if (filename && isDisallowedMedia(filename)) return [];

    const receivedAt = [message?.createdAt, message?.created_at, message?.timestamp]
      .find((value) => typeof value === "string") as string | undefined;

    return [{
      mediaUrl,
      messageId,
      filename,
      receivedAt: receivedAt ?? null,
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
            recipient: { id: (matchedPhone ?? telefoneE164).replace(/\D/g, "") },
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
    .in("telefone_e164", telefoneCandidates)
    .is("mae_id", null);
  if (linkError) console.error("zap-handoff: failed to link imported documents", linkError.message);

  console.log("zap-handoff: conversation history sync completed", {
    pages: pageCount,
    messages: messages.length,
    media: mediaMessages.length,
    matchedPhoneSuffix: matchedPhone?.slice(-4) ?? null,
    removedOperationDocuments,
    stored,
    duplicates,
    failed,
  });

  if (failed > 0) return "partial";
  // Uma conversa sem mídias do cliente é um processamento concluído (não há o
  // que importar) — não deve manter o job preso em "pending".
  return mediaMessages.length > 0 ? "complete" : "empty";
}

async function processAutomaticDocumentSyncJobs(targetMaeId?: string | null): Promise<AnyObj> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  let query = supabaseAdmin
    .from("zap_document_sync_jobs")
    .select("mae_id, telefone_e164, attempts, status");

  if (targetMaeId) {
    // Processamento direcionado (sincronização manual ou job recém-criado):
    // ignora janela de retry e status para rodar imediatamente.
    query = query.eq("mae_id", targetMaeId).limit(1);
  } else {
    query = query
      // Jobs concluídos são revalidados após 1 hora (next_attempt_at futuro),
      // garantindo que novos documentos enviados depois sejam importados.
      .in("status", ["pending", "complete"])
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      // Históricos com muitos anexos podem levar dezenas de segundos. Um lote
      // pequeno evita o timeout de 150 s da Edge Function.
      .limit(3);
  }

  const { data: jobs, error: jobsError } = await query;

  if (jobsError) throw jobsError;

  const results: AnyObj[] = [];
  for (const job of jobs ?? []) {
    const wasComplete = job.status === "complete";
    const attempt = wasComplete ? 1 : Number(job.attempts ?? 0) + 1;
    let result: HistorySyncResult = "partial";
    let lastError: string | null = null;

    try {
      result = await syncZapConversationHistory(job.telefone_e164, job.mae_id);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    // "empty" também conta como processamento concluído.
    const completed = !lastError && (result === "complete" || result === "empty");
    const exhausted = attempt >= DOCUMENT_SYNC_RETRY_MINUTES.length;
    const retryMinutes = completed
      ? DOCUMENT_SYNC_REVALIDATE_MINUTES
      : DOCUMENT_SYNC_RETRY_MINUTES[Math.min(attempt - 1, DOCUMENT_SYNC_RETRY_MINUTES.length - 1)];
    const nextAttemptAt = new Date(Date.now() + retryMinutes * 60_000).toISOString();
    const status = completed ? "complete" : exhausted ? "failed" : "pending";

    const { error: updateError } = await supabaseAdmin
      .from("zap_document_sync_jobs")
      .update({
        status,
        attempts: completed ? 0 : attempt,
        next_attempt_at: nextAttemptAt,
        last_error: lastError ?? (completed ? null : result),
        updated_at: new Date().toISOString(),
      })
      .eq("mae_id", job.mae_id);
    if (updateError) {
      console.error("zap-handoff: failed to update document sync job", updateError.message);
    }

    results.push({ maeId: job.mae_id, attempt, result, status, revalidation: wasComplete });

  }

  return {
    success: true,
    processed: results.length,
    results,
  };
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
    const mode = url.searchParams.get("mode");
    if (mode === "sync_pending_documents") {
      const expectedInternalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN")?.trim();
      const authorization = req.headers.get("authorization") ?? "";
      const receivedInternalToken = authorization.replace(/^Bearer\s+/i, "").trim();
      if (!expectedInternalToken || receivedInternalToken !== expectedInternalToken) {
        console.warn("zap-handoff: invalid internal sync token");
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

      const result = await processAutomaticDocumentSyncJobs(url.searchParams.get("mae_id"));
      return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders });
    }
    const deferDocumentSync = url.searchParams.get("defer_document_sync") === "true";

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

    // "Mãe única": aceita variações de nome de campo e de valor (Sim/Não, true/false, 1/0)
    const maeUnica = extractMaeUnica(card, additionalFields);
    console.log("zap-handoff: mae_unica extraída:", maeUnica);


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
        const dupUpdates: Record<string, unknown> = {};
        if (cardUrl && existing.link_documentos !== cardUrl) dupUpdates.link_documentos = cardUrl;
        if (maeUnica !== null) dupUpdates.mae_unica = maeUnica;
        if (Object.keys(dupUpdates).length > 0) {
          const { error: linkError } = await supabaseAdmin
            .from("mae_processo")
            .update(dupUpdates)
            .eq("id", existing.id);
          if (linkError) {
            console.error("zap-handoff: failed to update card link", linkError.message);
          }
        }

        if (telefoneE164) {
          const telefoneCandidates = phoneCandidatesBR(telefoneE164);
          const { error: documentsError } = await supabaseAdmin
            .from("mae_documentos")
            .update({ mae_id: existing.id })
            .in("telefone_e164", telefoneCandidates)
            .is("mae_id", null);
          if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
        }
        await enqueueAutomaticDocumentSync(existing.id, telefoneE164, !deferDocumentSync);
        console.log("zap-handoff: duplicate by zap_card_id", cardId, existing.id);
        return new Response(
          JSON.stringify({ duplicate: true, id: existing.id, card_linked: cardUrl !== null }),
          { status: 200, headers: jsonHeaders },
        );
      }
    }

    if (telefoneE164) {
      const telefoneCandidates = phoneCandidatesBR(telefoneE164);
      const { data: existing } = await supabaseAdmin
        .from("mae_processo")
        .select("id, zap_card_id, link_documentos")
        .in("telefone_e164", telefoneCandidates)
        .limit(1)
        .maybeSingle();
      if (existing) {
        const updates: Record<string, unknown> = {};
        if (cardUrl && existing.link_documentos !== cardUrl) updates.link_documentos = cardUrl;
        if (cardId && !existing.zap_card_id) updates.zap_card_id = cardId;
        if (maeUnica !== null) updates.mae_unica = maeUnica;

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
          .in("telefone_e164", telefoneCandidates)
          .is("mae_id", null);
        if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
        await enqueueAutomaticDocumentSync(existing.id, telefoneE164, !deferDocumentSync);
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
        mae_unica: maeUnica,

        mes_gestacao: mesGestacao,
        categoria_previdenciaria: "Não informado",
        status_processo: "Pré-Análise de Elegibilidade",
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
      const telefoneCandidates = phoneCandidatesBR(telefoneE164);
      const { error: documentsError } = await supabaseAdmin
        .from("mae_documentos")
        .update({ mae_id: newMae.id })
        .in("telefone_e164", telefoneCandidates)
        .is("mae_id", null);
      if (documentsError) console.error("zap-handoff: failed to link pending documents", documentsError.message);
    }
    await enqueueAutomaticDocumentSync(newMae.id, telefoneE164, !deferDocumentSync);
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
