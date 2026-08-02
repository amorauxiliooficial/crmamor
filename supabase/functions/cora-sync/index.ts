import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Obj = Record<string, any>;

const jsonHeaders = { "Content-Type": "application/json" };
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const moneyCents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const dayDiff = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

function getCounterParty(entry: Obj): Obj {
  return entry?.transaction?.counterParty ?? entry?.transaction?.counterparty ?? entry?.counterParty ?? {};
}

function normalizeEntry(entry: Obj) {
  const counterParty = getCounterParty(entry);
  return {
    cora_entry_id: String(entry.id),
    tipo: String(entry.type || "CREDIT").toUpperCase(),
    valor_centavos: Number(entry.amount ?? 0),
    ocorrido_em: entry.createdAt,
    transaction_id: entry?.transaction?.id ?? null,
    transaction_type: entry?.transaction?.type ?? null,
    descricao: entry?.transaction?.description ?? entry.description ?? null,
    contraparte_nome: counterParty.name ?? counterParty.businessName ?? null,
    contraparte_documento: digits(counterParty.document ?? counterParty.documentNumber) || null,
    dados_originais: entry,
    sincronizado_em: new Date().toISOString(),
  };
}

serve(async (req) => {
  let syncId: string | null = null;
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const internalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN") ?? "";
    let userId: string | null = null;

    if (token && token === internalToken) {
      userId = null;
    } else {
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
      userId = userData.user.id;
      const { data: staff } = await admin.rpc("is_staff", { _user_id: userId });
      if (!staff) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    const clientId = Deno.env.get("CORA_CLIENT_ID")?.trim();
    const certificate = Deno.env.get("CORA_CERTIFICATE_PEM")?.replace(/\\n/g, "\n");
    const privateKey = Deno.env.get("CORA_PRIVATE_KEY_PEM")?.replace(/\\n/g, "\n");
    const baseUrl = (Deno.env.get("CORA_API_BASE_URL") || "https://matls-clients.api.cora.com.br").replace(/\/+$/, "");
    if (!clientId || !certificate || !privateKey) {
      return new Response(JSON.stringify({ configured: false, error: "Credenciais Cora ainda não configuradas" }), { status: 412, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const end = typeof body.end === "string" ? body.end : new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${end}T12:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - Math.min(Math.max(Number(body.days ?? 30), 1), 90));
    const start = typeof body.start === "string" ? body.start : startDate.toISOString().slice(0, 10);

    const { data: syncRow, error: syncError } = await admin.from("cora_sincronizacoes").insert({
      periodo_inicio: start, periodo_fim: end, executado_por: userId,
    }).select("id").single();
    if (syncError) throw syncError;
    syncId = syncRow.id;

    const httpClient = Deno.createHttpClient({ certChain: certificate, privateKey });
    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: "POST",
      client: httpClient,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId }),
    } as RequestInit & { client: Deno.HttpClient });
    if (!tokenResponse.ok) throw new Error(`Cora token: ${tokenResponse.status} ${(await tokenResponse.text()).slice(0, 300)}`);
    const tokenPayload = await tokenResponse.json();

    let page = 1;
    const entries: Obj[] = [];
    while (page <= 20) {
      const url = new URL(`${baseUrl}/bank-statement/statement`);
      url.searchParams.set("start", start);
      url.searchParams.set("end", end);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", "500");
      const response = await fetch(url, {
        client: httpClient,
        headers: { Authorization: `Bearer ${tokenPayload.access_token}`, Accept: "application/json" },
      } as RequestInit & { client: Deno.HttpClient });
      if (!response.ok) throw new Error(`Cora extrato: ${response.status} ${(await response.text()).slice(0, 300)}`);
      const payload = await response.json();
      const pageEntries = Array.isArray(payload.entries) ? payload.entries : [];
      entries.push(...pageEntries);
      if (pageEntries.length < 500) break;
      page++;
    }
    httpClient.close();

    const normalized = entries.filter((entry) => entry?.id && entry?.createdAt).map(normalizeEntry);
    const { data: maes } = await admin.from("mae_processo").select("id,nome_mae,cpf");
    const { data: pagamentos } = await admin.from("pagamentos_mae").select("id,mae_id");
    const { data: parcelas } = await admin.from("parcelas_pagamento").select("id,pagamento_id,valor,data_pagamento,status").neq("status", "pago");
    const { data: despesas } = await admin.from("despesas").select("id,valor,data_vencimento,status,fornecedor,descricao").neq("status", "pago");
    const maePorPagamento = new Map((pagamentos ?? []).map((p: Obj) => [p.id, p.mae_id]));

    for (const movement of normalized) {
      let score = 0;
      const reasons: string[] = [];
      let maeId: string | null = null;
      let parcelaId: string | null = null;
      let despesaId: string | null = null;

      if (movement.tipo === "CREDIT") {
        const byDocument = (maes ?? []).find((m: Obj) => digits(m.cpf) && digits(m.cpf) === movement.contraparte_documento);
        if (byDocument) { maeId = byDocument.id; score += 70; reasons.push("CPF da mãe confere"); }
        const candidates = (parcelas ?? []).filter((p: Obj) => moneyCents(p.valor) === movement.valor_centavos && (!maeId || maePorPagamento.get(p.pagamento_id) === maeId));
        const best = candidates.sort((a: Obj, b: Obj) => dayDiff(a.data_pagamento, movement.ocorrido_em) - dayDiff(b.data_pagamento, movement.ocorrido_em))[0];
        if (best && dayDiff(best.data_pagamento, movement.ocorrido_em) <= 15) {
          parcelaId = best.id; maeId ||= maePorPagamento.get(best.pagamento_id) ?? null; score += 25; reasons.push("Valor e data próximos da parcela");
        }
      } else if (movement.tipo === "DEBIT") {
        const best = (despesas ?? []).filter((d: Obj) => moneyCents(d.valor) === movement.valor_centavos)
          .sort((a: Obj, b: Obj) => dayDiff(a.data_vencimento, movement.ocorrido_em) - dayDiff(b.data_vencimento, movement.ocorrido_em))[0];
        if (best && dayDiff(best.data_vencimento, movement.ocorrido_em) <= 15) {
          despesaId = best.id; score = 75; reasons.push("Valor e data próximos da despesa");
        }
      }

      Object.assign(movement, {
        situacao: score >= 70 ? "sugerido" : "pendente",
        mae_sugerida_id: maeId,
        parcela_sugerida_id: parcelaId,
        despesa_sugerida_id: despesaId,
        confianca: Math.min(score, 100),
        motivos: reasons,
      });
    }

    if (normalized.length) {
      const { error } = await admin.from("cora_movimentacoes").upsert(normalized, { onConflict: "cora_entry_id", ignoreDuplicates: false });
      if (error) throw error;
    }
    await admin.from("cora_sincronizacoes").update({ status: "sucesso", finalizado_em: new Date().toISOString(), importados: normalized.length }).eq("id", syncId);
    return new Response(JSON.stringify({ success: true, start, end, processed: normalized.length }), { headers: jsonHeaders });
  } catch (error) {
    console.error("cora-sync:", error instanceof Error ? error.message : String(error));
    if (syncId) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("cora_sincronizacoes").update({ status: "erro", finalizado_em: new Date().toISOString(), mensagem: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) }).eq("id", syncId);
    }
    return new Response(JSON.stringify({ error: "Não foi possível sincronizar a Cora" }), { status: 500, headers: jsonHeaders });
  }
});

