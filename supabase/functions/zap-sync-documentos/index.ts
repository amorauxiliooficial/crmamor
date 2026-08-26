import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN")?.trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("zap-sync-documentos: missing configuration");
    return new Response(JSON.stringify({ error: "Function not configured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  // 1) Autenticação: apenas usuários logados do CRM
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: isStaff, error: staffError } = await admin.rpc("is_staff", {
    _user_id: userData.user.id,
  });
  if (staffError) {
    console.error("zap-sync-documentos: is_staff check failed", staffError.message);
  }
  if (!isStaff) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  // 2) Validação de entrada
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const maeId = typeof body.maeId === "string" ? body.maeId.trim() : "";
  if (!UUID_RE.test(maeId)) {
    return new Response(JSON.stringify({ error: "maeId inválido" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { data: mae, error: maeError } = await admin
    .from("mae_processo")
    .select("id, telefone_e164")
    .eq("id", maeId)
    .maybeSingle();

  if (maeError) {
    console.error("zap-sync-documentos: mae lookup failed", maeError.message);
    return new Response(JSON.stringify({ error: "Erro ao localizar a mãe" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  if (!mae) {
    return new Response(JSON.stringify({ error: "Mãe não encontrada" }), {
      status: 404,
      headers: jsonHeaders,
    });
  }
  if (!mae.telefone_e164) {
    return new Response(
      JSON.stringify({ error: "Cadastro sem telefone válido para buscar a conversa." }),
      { status: 422, headers: jsonHeaders },
    );
  }

  // 3) Reagenda o job para agora
  const nowIso = new Date().toISOString();
  const { error: upsertError } = await admin
    .from("zap_document_sync_jobs")
    .upsert({
      mae_id: mae.id,
      telefone_e164: mae.telefone_e164,
      status: "pending",
      attempts: 0,
      next_attempt_at: nowIso,
      last_error: null,
      updated_at: nowIso,
    }, { onConflict: "mae_id" });

  if (upsertError) {
    console.error("zap-sync-documentos: failed to enqueue job", upsertError.message);
    return new Response(JSON.stringify({ error: "Não foi possível agendar a sincronização" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!internalToken) {
    console.warn("zap-sync-documentos: INTERNAL_FUNCTION_TOKEN missing; job only queued");
    return new Response(
      JSON.stringify({ success: true, queued: true, processed: false }),
      { status: 202, headers: jsonHeaders },
    );
  }

  // 4) Dispara o processamento imediato dessa mãe (segredo interno fica no servidor)
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/zap-handoff?mode=sync_pending_documents&mae_id=${encodeURIComponent(mae.id)}`,
      { method: "POST", headers: { Authorization: `Bearer ${internalToken}` } },
    );
    const text = await response.text();
    if (!response.ok) {
      console.error("zap-sync-documentos: worker failed", {
        status: response.status,
        body: text.slice(0, 500),
      });
      return new Response(
        JSON.stringify({ success: false, queued: true, error: "Falha ao processar a conversa" }),
        { status: 502, headers: jsonHeaders },
      );
    }

    let worker: unknown = null;
    try {
      worker = JSON.parse(text);
    } catch {
      worker = null;
    }

    return new Response(JSON.stringify({ success: true, queued: true, processed: true, worker }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error(
      "zap-sync-documentos: worker unavailable",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(
      JSON.stringify({ success: false, queued: true, error: "Serviço indisponível" }),
      { status: 502, headers: jsonHeaders },
    );
  }
});
