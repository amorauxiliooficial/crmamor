import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCorsHeaders } from "../_shared/cors.ts";

// deno-lint-ignore no-explicit-any
type AnyObj = Record<string, any>;
type Direction = "customer" | "operation";

interface StoredMessage {
  id: string;
  source_message_id: string;
  telefone_e164: string;
  direction: Direction;
  texto: string;
  attendant_name: string | null;
  occurred_at: string;
}

const SUMMARY_AUTHOR = "ZapResponder · Resumo IA";
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_TRANSCRIPT_LENGTH = 18_000;
const MESSAGE_RETENTION_DAYS = 45;
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const MAX_SUMMARY_TOKENS = 700;

function getPath(obj: AnyObj | null | undefined, path: string): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as AnyObj)[key];
    return undefined;
  }, obj);
}

function firstDefined(obj: AnyObj, paths: string[]): unknown {
  for (const path of paths) {
    const value = getPath(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizePhoneToE164BR(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  let digits = String(input).replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return null;
  return `+55${digits}`;
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

function eventType(body: AnyObj): string {
  return String(body.type ?? body.event ?? body.eventType ?? body.event_type ?? "").toLowerCase();
}

function inferDirection(body: AnyObj, data: AnyObj): Direction | null {
  const type = eventType(body);
  if ([
    "message.received",
    "message_received",
    "messages.received",
    "whatsapp_message_received",
  ].includes(type)) return "customer";
  if ([
    "message.sent",
    "message_sent",
    "messages.sent",
    "whatsapp_message_sent",
  ].includes(type)) return "operation";
  if (type.includes("message") && (type.includes("received") || type.includes("recebida"))) {
    return "customer";
  }
  if (type.includes("message") && (type.includes("sent") || type.includes("enviada"))) {
    return "operation";
  }

  const fromMe = toOptionalBool(firstDefined(data, [
    "isFromMe",
    "isMine",
    "mine",
    "fromMe",
    "from_me",
    "sentByMe",
    "sent_by_me",
  ]));
  return fromMe === null ? null : fromMe ? "operation" : "customer";
}

function extractText(data: AnyObj): string | null {
  const messageType = String(firstDefined(data, [
    "type",
    "messageType",
    "message_type",
    "content.type",
    "mensagem.type",
  ]) ?? "").toLowerCase();
  if ([
    "audio",
    "document",
    "file",
    "image",
    "video",
    "sticker",
    "location",
    "contact",
  ].includes(messageType)) return null;

  const raw = firstDefined(data, [
    "content.text",
    "content.body",
    "message.text",
    "message.body",
    "text",
    "body",
    "content",
    "message",
    "mensagem",
    "mensagem.mensagem",
    "mensagem.text",
    "caption",
  ]);
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\u0000/g, "").trim();
  if (!text || /^https?:\/\/\S+$/i.test(text)) return null;
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

function extractPhone(data: AnyObj, direction: Direction): string | null {
  const preferredPaths = direction === "customer"
    ? [
      "sender.id",
      "sender.phone",
      "from",
      "contact.chatId",
      "contact.phone",
      "chatId",
      "phone",
      "recipient.id",
    ]
    : [
      "recipient.id",
      "recipient.phone",
      "to",
      "contact.chatId",
      "contact.phone",
      "chatId",
      "phone",
      "sender.id",
    ];
  return normalizePhoneToE164BR(firstDefined(data, preferredPaths));
}

function parseOccurredAt(data: AnyObj): string {
  const raw = firstDefined(data, [
    "sent_at",
    "created_at",
    "createdAt",
    "timestamp",
    "date",
  ]);
  if (typeof raw === "number") {
    const milliseconds = raw > 10_000_000_000 ? raw : raw * 1000;
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) {
    return new Date(raw).toISOString();
  }
  return new Date().toISOString();
}

function brazilDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() - BRAZIL_OFFSET_MS).toISOString().slice(0, 10);
}

function brazilTodayKey(): string {
  return brazilDateKey(new Date().toISOString());
}

function rangeForBrazilDate(dateKey: string): { start: string; end: string } {
  const start = new Date(`${dateKey}T03:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

async function storeWebhookMessage(body: AnyObj) {
  const nested = body.data ?? body.message;
  const data: AnyObj = nested && typeof nested === "object" ? nested : body;
  const direction = inferDirection(body, data);
  if (!direction) return { ignored: true, reason: "unknown_direction" };

  const text = extractText(data);
  if (!text) return { ignored: true, reason: "not_text" };

  const telefoneE164 = extractPhone(data, direction) ?? extractPhone(body, direction);
  const messageIdRaw = firstDefined(data, ["id", "_id", "messageId", "message_id", "key.id"]) ??
    firstDefined(body, [
      "id",
      "_id",
      "messageId",
      "message_id",
      "key.id",
      "raw_message.id",
      "raw_message._id",
      "raw_message.messageId",
      "raw_message.message_id",
      "raw_message.key.id",
    ]);
  const messageId = typeof messageIdRaw === "string" || typeof messageIdRaw === "number"
    ? String(messageIdRaw).trim()
    : "";
  if (!telefoneE164 || !messageId) {
    console.warn("zap-conversation-summary: message missing phone or id");
    return { ignored: true, reason: "missing_identity" };
  }

  const supabaseAdmin = adminClient();
  const { data: mae, error: maeError } = await supabaseAdmin
    .from("mae_processo")
    .select("id")
    .eq("telefone_e164", telefoneE164)
    .eq("contrato_assinado", true)
    .limit(1)
    .maybeSingle();
  if (maeError) throw maeError;
  if (!mae) {
    return { ignored: true, reason: "mother_not_registered" };
  }

  const attendantRaw = firstDefined(data, [
    "attendant.name",
    "attendantName",
    "attendant_name",
    "user.name",
    "sender.name",
    "operator.name",
  ]);
  const conversationRaw = firstDefined(data, [
    "conversation.id",
    "conversationId",
    "conversation_id",
    "chat.id",
    "chatId",
  ]);

  const { error } = await supabaseAdmin
    .from("zap_conversation_messages")
    .upsert({
      source_message_id: messageId,
      conversation_id: typeof conversationRaw === "string" ? conversationRaw : null,
      mae_id: mae.id,
      telefone_e164: telefoneE164,
      direction,
      texto: text,
      attendant_name: typeof attendantRaw === "string" && attendantRaw.trim()
        ? attendantRaw.trim().slice(0, 160)
        : null,
      occurred_at: parseOccurredAt(data),
    }, { onConflict: "source_message_id", ignoreDuplicates: true });
  if (error) throw error;

  return { success: true, linked: true };
}

async function generateAiSummary(
  messages: StoredMessage[],
  motherName: string,
  dateKey: string,
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada");
  const model = Deno.env.get("OPENAI_SUMMARY_MODEL") || DEFAULT_OPENAI_MODEL;

  const selected: StoredMessage[] = [];
  let transcriptLength = 0;
  for (const message of [...messages].reverse()) {
    const line = `${message.direction === "customer" ? "Cliente" : message.attendant_name || "Atendente"}: ${message.texto}`;
    if (transcriptLength + line.length > MAX_TRANSCRIPT_LENGTH) break;
    selected.push(message);
    transcriptLength += line.length;
  }
  selected.reverse();

  const transcript = selected.map((message) =>
    `${message.direction === "customer" ? "Cliente" : message.attendant_name || "Atendente"}: ${message.texto}`
  ).join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: MAX_SUMMARY_TOKENS,
      messages: [
        {
          role: "system",
          content: `Você gera registros objetivos para um CRM de atendimento de salário-maternidade.
Use SOMENTE fatos presentes na conversa. Não invente diagnósticos, prazos, promessas ou pendências.
Nunca exponha senhas, códigos de acesso, dados bancários ou CPF completo.
Ignore saudações, emojis e mensagens automáticas sem relevância.
Responda em português, sem introdução, neste formato exato:
**Resumo do atendimento**
[2 a 5 frases objetivas]

**Pendências da cliente:** [itens ou "Nenhuma identificada"]
**Pendências da equipe:** [itens ou "Nenhuma identificada"]
**Próxima ação:** [ação e prazo somente se mencionados, senão "Não definida"]
**Atendente:** [nome identificado ou "Não identificada"]
**Gerado automaticamente por IA.**`,
        },
        {
          role: "user",
          content: `Cliente: ${motherName}\nData: ${dateKey.split("-").reverse().join("/")}\n\nConversa:\n${transcript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("zap-conversation-summary: AI error", response.status, body.slice(0, 500));
    throw new Error("Não foi possível gerar o resumo com IA");
  }
  const payload: AnyObj = await response.json();
  const summary = payload.choices?.[0]?.message?.content;
  if (typeof summary !== "string" || !summary.trim()) {
    throw new Error("A IA retornou um resumo vazio");
  }
  return summary.trim().slice(0, 8_000);
}

async function generateSummaryForPhone(
  telefoneE164: string,
  dateKey: string,
  forcedMaeId?: string,
) {
  const supabaseAdmin = adminClient();
  const { start, end } = rangeForBrazilDate(dateKey);

  let motherQuery = supabaseAdmin
    .from("mae_processo")
    .select("id, nome_mae, link_documentos")
    .eq("contrato_assinado", true);
  motherQuery = forcedMaeId
    ? motherQuery.eq("id", forcedMaeId)
    : motherQuery.eq("telefone_e164", telefoneE164);
  const { data: mother, error: motherError } = await motherQuery.limit(1).maybeSingle();
  if (motherError) throw motherError;
  if (!mother) return { skipped: true, reason: "mother_not_found" };

  const { data: rows, error: messagesError } = await supabaseAdmin
    .from("zap_conversation_messages")
    .select("id, source_message_id, telefone_e164, direction, texto, attendant_name, occurred_at")
    .eq("mae_id", mother.id)
    .eq("telefone_e164", telefoneE164)
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: true })
    .limit(500);
  if (messagesError) throw messagesError;
  const messages = (rows ?? []) as StoredMessage[];
  if (messages.length === 0) return { skipped: true, reason: "no_messages" };

  const summary = await generateAiSummary(messages, mother.nome_mae, dateKey);
  const lastMessageAt = messages.at(-1)!.occurred_at;
  const cardLink = typeof mother.link_documentos === "string" && mother.link_documentos
    ? `\n\nConversa original: ${mother.link_documentos}`
    : "";
  const observationText = `${summary}${cardLink}`;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("zap_daily_summaries")
    .select("id, observation_id")
    .eq("telefone_e164", telefoneE164)
    .eq("summary_date", dateKey)
    .maybeSingle();
  if (existingError) throw existingError;

  let observationId = existing?.observation_id as string | undefined;
  if (observationId) {
    const { error } = await supabaseAdmin
      .from("mae_observacoes")
      .update({
        texto: observationText,
        categoria: "whatsapp",
        autor_nome: SUMMARY_AUTHOR,
        created_at: lastMessageAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", observationId);
    if (error) throw error;
  } else {
    const { data: observation, error } = await supabaseAdmin
      .from("mae_observacoes")
      .insert({
        mae_id: mother.id,
        autor_id: null,
        autor_nome: SUMMARY_AUTHOR,
        texto: observationText,
        categoria: "whatsapp",
        created_at: lastMessageAt,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    observationId = observation.id;
  }

  const { error: summaryError } = await supabaseAdmin
    .from("zap_daily_summaries")
    .upsert({
      mae_id: mother.id,
      telefone_e164: telefoneE164,
      summary_date: dateKey,
      observation_id: observationId,
      message_count: messages.length,
      last_message_at: lastMessageAt,
    }, { onConflict: "telefone_e164,summary_date" });
  if (summaryError) throw summaryError;

  for (let index = 0; index < messages.length; index += 100) {
    const { error: processedError } = await supabaseAdmin
      .from("zap_conversation_messages")
      .update({ processed_at: new Date().toISOString(), mae_id: mother.id })
      .in("id", messages.slice(index, index + 100).map((message) => message.id));
    if (processedError) throw processedError;
  }

  return {
    success: true,
    mae_id: mother.id,
    observation_id: observationId,
    message_count: messages.length,
    date: dateKey,
  };
}

async function generateManualSummary(maeId: string) {
  const supabaseAdmin = adminClient();
  const { data: mother, error } = await supabaseAdmin
    .from("mae_processo")
    .select("id, telefone_e164")
    .eq("id", maeId)
    .maybeSingle();
  if (error) throw error;
  if (!mother?.telefone_e164) return { skipped: true, reason: "mother_without_phone" };
  return await generateSummaryForPhone(mother.telefone_e164, brazilTodayKey(), mother.id);
}

async function generatePendingDailySummaries() {
  const supabaseAdmin = adminClient();
  const todayRange = rangeForBrazilDate(brazilTodayKey());
  const retentionStart = new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabaseAdmin
    .from("zap_conversation_messages")
    .select("telefone_e164, occurred_at")
    .not("mae_id", "is", null)
    .is("processed_at", null)
    .gte("occurred_at", retentionStart)
    .lt("occurred_at", todayRange.start)
    .order("occurred_at", { ascending: true })
    .limit(2_000);
  if (error) throw error;

  const groups = new Map<string, { phone: string; date: string }>();
  for (const row of pending ?? []) {
    const date = brazilDateKey(row.occurred_at);
    groups.set(`${row.telefone_e164}|${date}`, { phone: row.telefone_e164, date });
  }

  const results = [];
  for (const group of groups.values()) {
    try {
      results.push(await generateSummaryForPhone(group.phone, group.date));
    } catch (error) {
      console.error(
        "zap-conversation-summary: daily group failed",
        group.phone,
        group.date,
        error instanceof Error ? error.message : String(error),
      );
      results.push({ success: false, phone: group.phone, date: group.date });
    }
  }

  await supabaseAdmin
    .from("zap_conversation_messages")
    .delete()
    .lt("occurred_at", retentionStart);

  return {
    success: true,
    groups: groups.size,
    generated: results.filter((result) => result.success).length,
    results,
  };
}

async function requireStaff(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabaseAdmin = adminClient();
  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return null;
  const { data: isStaff, error: staffError } = await supabaseAdmin
    .rpc("is_staff", { _user_id: userData.user.id });
  return !staffError && isStaff ? userData.user.id : null;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const body: AnyObj = await req.json();
    const action = typeof body.action === "string" ? body.action : null;

    if (action === "generate_now") {
      const staffUserId = await requireStaff(req);
      if (!staffUserId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const maeId = typeof body.mae_id === "string" ? body.mae_id.trim() : "";
      if (!maeId) return jsonResponse({ error: "mae_id obrigatório" }, 400, corsHeaders);
      const result = await generateManualSummary(maeId);
      return jsonResponse(result, 200, corsHeaders);
    }

    if (action === "daily") {
      const expectedToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN");
      const receivedToken = req.headers.get("x-internal-token");
      if (!expectedToken || receivedToken !== expectedToken) {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      }
      const result = await generatePendingDailySummaries();
      return jsonResponse(result, 200, corsHeaders);
    }

    const url = new URL(req.url);
    const expectedSecret = Deno.env.get("ZAP_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const result = await storeWebhookMessage(body);

    try {
      const eventValue = body?.type ?? body?.event ?? body?.eventType ?? body?.event_type ?? null;
      const keysOf = (obj: unknown): string[] =>
        obj && typeof obj === "object" && !Array.isArray(obj)
          ? Object.keys(obj as AnyObj).slice(0, 40)
          : [];
      const diag: AnyObj = {
        event: typeof eventValue === "string" ? eventValue : eventValue === null ? null : typeof eventValue,
        result: {
          success: (result as AnyObj)?.success ?? null,
          ignored: (result as AnyObj)?.ignored ?? null,
          reason: (result as AnyObj)?.reason ?? null,
        },
        bodyKeys: keysOf(body),
      };
      for (const key of ["data", "message", "payload", "conversation", "contact"] as const) {
        const nested = (body as AnyObj)?.[key];
        if (nested && typeof nested === "object") diag[`${key}Keys`] = keysOf(nested);
      }
      console.log("zap-conversation-summary: webhook diag", JSON.stringify(diag));
    } catch (_diagErr) {
      // diagnostic logging must never break the handler
    }

    return jsonResponse(result, 200, corsHeaders);
  } catch (error) {
    console.error(
      "zap-conversation-summary: unexpected error",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse({ error: "Erro interno do servidor" }, 500, corsHeaders);
  }
});
