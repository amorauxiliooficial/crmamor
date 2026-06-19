import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { publicCorsHeaders } from "../_shared/cors.ts";

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
    console.log("ZAP webhook payload:", JSON.stringify(body));

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
    console.log("ZAP additionalFields:", JSON.stringify(additionalFields));

    const cpfRaw = additionalFields[ZAP_FIELD_CPF];
    let cpf = cpfRaw !== undefined ? String(cpfRaw).replace(/\D/g, "") : "";
    if (cpf.length !== 11) {
      cpf = "";
    }

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
        .select("id")
        .eq("zap_card_id", cardId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        console.log("zap-handoff: duplicate by zap_card_id", cardId, existing.id);
        return new Response(JSON.stringify({ duplicate: true, id: existing.id }), {
          status: 200,
          headers: jsonHeaders,
        });
      }
    }

    if (telefoneE164) {
      const { data: existing } = await supabaseAdmin
        .from("mae_processo")
        .select("id")
        .eq("telefone_e164", telefoneE164)
        .limit(1)
        .maybeSingle();
      if (existing) {
        console.log("zap-handoff: duplicate by telefone_e164", telefoneE164, existing.id);
        return new Response(JSON.stringify({ duplicate: true, id: existing.id }), {
          status: 200,
          headers: jsonHeaders,
        });
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
        status_processo: "Entradas do Mês",
        tipo_evento: "Parto",
        contrato_assinado: true,
        verificacao_duas_etapas: false,
        precisa_das: false,
        das_concluido: false,
        origem: "Zap Responder",
        etiqueta,
        observacoes,
        zap_card_id: cardId,
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

    const incomplete = cpf === "" || senhaGov === null;
    console.log("zap-handoff: created mae_processo", newMae.id, "incomplete:", incomplete);

    return new Response(JSON.stringify({ success: true, id: newMae.id, incomplete }), {
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
