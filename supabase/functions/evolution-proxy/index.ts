import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth check
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return toJson({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return toJson({ error: "Unauthorized" }, 401);
  }

  // Evolution env
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return toJson({ error: "Evolution API not configured on server" }, 500);
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");

  try {
    const body = await req.json();
    const { action, instanceName, phone, text } = body as {
      action: string;
      instanceName?: string;
      phone?: string;
      text?: string;
    };

    if (!action) return toJson({ error: 'Missing "action"' }, 400);

    let evoUrl = "";
    let method = "GET";
    let evoBody: string | undefined;

    switch (action) {
      case "fetchInstances":
        evoUrl = `${baseUrl}/instance/fetchInstances`;
        break;

      case "createInstance":
        if (!instanceName) return toJson({ error: "Missing instanceName" }, 400);
        evoUrl = `${baseUrl}/instance/create`;
        method = "POST";
        evoBody = JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        });
        break;

      case "connect":
        if (!instanceName) return toJson({ error: "Missing instanceName" }, 400);
        evoUrl = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
        break;

      case "connectionState":
        if (!instanceName) return toJson({ error: "Missing instanceName" }, 400);
        evoUrl = `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
        break;

      case "deleteInstance":
        if (!instanceName) return toJson({ error: "Missing instanceName" }, 400);
        evoUrl = `${baseUrl}/instance/delete/${encodeURIComponent(instanceName)}`;
        method = "DELETE";
        break;

      case "sendText":
        if (!instanceName || !phone || !text) {
          return toJson({ error: "Missing instanceName, phone, or text" }, 400);
        }
        evoUrl = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
        method = "POST";
        evoBody = JSON.stringify({
          number: phone.replace(/^\+/, ""),
          text: text,
        });
        break;

      default:
        return toJson({ error: `Unknown action: ${action}` }, 400);
    }

    console.log(`🔄 Evolution proxy: ${action} → ${method} ${evoUrl}`);

    const evoRes = await fetch(evoUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
        Authorization: `Bearer ${EVOLUTION_API_KEY}`,
      },
      ...(evoBody ? { body: evoBody } : {}),
    });

    const responseText = await evoRes.text();
    let responseJson: unknown = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (!evoRes.ok) {
      console.error(`❌ Evolution ${evoRes.status}: ${responseText.slice(0, 300)}`);
      return toJson(
        { error: `Evolution API error (${evoRes.status})`, details: responseJson },
        evoRes.status >= 500 ? 502 : evoRes.status,
      );
    }

    return toJson(responseJson);
  } catch (err) {
    console.error("❌ evolution-proxy error:", err);
    return toJson({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
