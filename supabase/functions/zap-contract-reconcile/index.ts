import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AnyObj = Record<string, unknown>;

const DEFAULT_PIPELINE_ID = "6a27ff28c7f1661d384e305b";
const ZAP_API_BASE = "https://api.zapresponder.com.br/api";
const MAX_CONCURRENCY = 5;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isObject(value: unknown): value is AnyObj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cardId(card: AnyObj): string | null {
  const value = card.cardId ?? card._id ?? card.id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stageName(card: AnyObj): string {
  const stage = card.stage;
  if (!isObject(stage)) return "";
  return typeof stage.name === "string" ? stage.name : "";
}

function extractCards(payload: unknown): AnyObj[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];

  for (const key of ["cards", "data", "docs", "items", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isObject);
    if (isObject(value)) {
      for (const nestedKey of ["cards", "docs", "items", "results"]) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) return nested.filter(isObject);
      }
    }
  }
  return [];
}

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(MAX_CONCURRENCY, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
}

serve(async (req) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const expectedToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN")?.trim();
    const receivedToken = (req.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!expectedToken || receivedToken !== expectedToken) {
      console.warn("zap-contract-reconcile: invalid internal token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const apiToken = Deno.env.get("ZAP_API_TOKEN")?.trim();
    const webhookSecret = Deno.env.get("ZAP_WEBHOOK_SECRET")?.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const pipelineId = Deno.env.get("ZAP_CRM_PIPELINE_ID")?.trim() || DEFAULT_PIPELINE_ID;

    if (!apiToken || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      console.error("zap-contract-reconcile: required configuration missing");
      return new Response(JSON.stringify({ error: "Integration not configured" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const cardsResponse = await fetch(
      `${ZAP_API_BASE}/v2/crm/cards?pipelineId=${encodeURIComponent(pipelineId)}&limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!cardsResponse.ok) {
      const body = (await cardsResponse.text()).slice(0, 500);
      console.error("zap-contract-reconcile: card listing failed", {
        status: cardsResponse.status,
        body,
      });
      return new Response(JSON.stringify({ error: "Could not list ZapResponder cards" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const allCards = extractCards(await cardsResponse.json());
    const contractCards = allCards.filter((card) =>
      normalizeText(stageName(card)).includes("contrato fechado")
    );
    const cardsById = new Map<string, AnyObj>();
    for (const card of contractCards) {
      const id = cardId(card);
      if (id) cardsById.set(id, card);
    }
    const ids = [...cardsById.keys()];

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: existingRows, error: existingError } = ids.length
      ? await supabase
        .from("mae_processo")
        .select("id, zap_card_id")
        .in("zap_card_id", ids)
      : { data: [], error: null };
    if (existingError) throw existingError;

    const maeByCardId = new Map<string, string>();
    for (const row of existingRows ?? []) {
      if (typeof row.zap_card_id === "string" && typeof row.id === "string") {
        maeByCardId.set(row.zap_card_id, row.id);
      }
    }

    const maeIds = [...maeByCardId.values()];
    const { data: jobRows, error: jobsError } = maeIds.length
      ? await supabase
        .from("zap_document_sync_jobs")
        .select("mae_id, status, updated_at")
        .in("mae_id", maeIds)
      : { data: [], error: null };
    if (jobsError) throw jobsError;

    // Jobs concluídos são revalidados após 1 hora.
    const REVALIDATE_AFTER_MS = 60 * 60 * 1000;
    const jobByMaeId = new Map<string, { status: string; updatedAt: number }>();
    for (const row of jobRows ?? []) {
      if (typeof row.mae_id === "string" && typeof row.status === "string") {
        const updatedAt = typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN;
        jobByMaeId.set(row.mae_id, {
          status: row.status,
          updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
        });
      }
    }

    const candidates = ids.filter((id) => {
      const maeId = maeByCardId.get(id);
      if (!maeId) return true;
      const job = jobByMaeId.get(maeId);
      if (!job) return true;
      if (job.status === "failed") return true;
      if (job.status === "complete") {
        return Date.now() - job.updatedAt >= REVALIDATE_AFTER_MS;
      }
      return false;
    });


    const results: Array<{ cardId: string; ok: boolean; status: number; error?: string }> = [];
    await runWithConcurrency(candidates, async (id) => {
      const card = cardsById.get(id);
      if (!card) return;

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/zap-handoff?defer_document_sync=true`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-secret": webhookSecret,
            },
            body: JSON.stringify({
              type: "crm_card_moved",
              card: { ...card, cardId: id },
            }),
          },
        );
        const responseBody = await response.text();
        results.push({
          cardId: id,
          ok: response.ok,
          status: response.status,
          ...(response.ok ? {} : { error: responseBody.slice(0, 300) }),
        });
      } catch (error) {
        results.push({
          cardId: id,
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const failed = results.filter((result) => !result.ok);
    console.log("zap-contract-reconcile: finished", {
      listed: allCards.length,
      contract: ids.length,
      candidates: candidates.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
    });

    return new Response(JSON.stringify({
      success: failed.length === 0,
      listed_cards: allCards.length,
      contract_cards: ids.length,
      candidates: candidates.length,
      processed: results.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
      failures: failed.slice(0, 20),
    }), {
      status: failed.length === 0 ? 200 : 207,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error(
      "zap-contract-reconcile: unexpected error",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
