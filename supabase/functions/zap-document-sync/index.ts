import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const expectedToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN")?.trim();
  const authorization = req.headers.get("authorization") ?? "";
  const receivedToken = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!expectedToken || receivedToken !== expectedToken) {
    console.warn("zap-document-sync: invalid internal token");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  if (!supabaseUrl) {
    console.error("zap-document-sync: SUPABASE_URL missing");
    return new Response(JSON.stringify({ error: "Function not configured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/zap-handoff?mode=sync_pending_documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${expectedToken}`,
        },
      },
    );
    const body = await response.text();

    if (!response.ok) {
      console.error("zap-document-sync: worker failed", {
        status: response.status,
        body: body.slice(0, 500),
      });
    }

    return new Response(body || JSON.stringify({ success: response.ok }), {
      status: response.status,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error(
      "zap-document-sync: worker request failed",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(JSON.stringify({ error: "Worker unavailable" }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
});
