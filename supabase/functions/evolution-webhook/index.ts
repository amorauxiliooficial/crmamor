import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Validate webhook secret
  const expectedSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  const receivedSecret = req.headers.get("x-webhook-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    console.warn("❌ Invalid or missing x-webhook-secret");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  });

  try {
    const body = await req.json();

    // Determine event type from path (webhook_by_events=true) or body
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Normalize event: path segment or body.event
    let eventType: string;
    if (lastSegment && lastSegment !== "evolution-webhook") {
      // Path-based routing: /evolution-webhook/qrcode-updated
      eventType = lastSegment.toUpperCase().replace(/-/g, "_");
    } else {
      eventType = (body.event ?? "UNKNOWN").toUpperCase().replace(/\./g, "_");
    }

    const instanceName: string | undefined =
      body.instance ?? body.data?.instance ?? body.instanceName;

    console.log(`📩 Evolution webhook: event=${eventType}, instance=${instanceName ?? "unknown"}`);

    if (!instanceName) {
      console.warn("⚠️ No instance name in payload, skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route by event type
    if (eventType === "QRCODE_UPDATED" || eventType === "QRCODE_UPDATE") {
      const qrCode: string | undefined =
        body.data?.qrcode?.base64 ??
        body.data?.qrcode ??
        body.qrcode?.base64 ??
        body.qrcode;

      if (!qrCode) {
        console.warn("⚠️ QRCODE_UPDATED but no qr data found");
      }

      const { error } = await supabase
        .from("whatsapp_instances")
        .update({ status: "qr_pending", qr_code: qrCode ?? null })
        .eq("evolution_instance_name", instanceName);

      if (error) {
        console.error("❌ Error updating QR:", error.message);
      } else {
        console.log(`✅ QR updated for ${instanceName}`);
      }
    } else if (eventType === "CONNECTION_UPDATE") {
      const state: string | undefined =
        body.data?.state ?? body.state ?? body.data?.status;

      console.log(`🔌 Connection state for ${instanceName}: ${state}`);

      if (state === "open" || state === "connected") {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({ status: "connected", qr_code: null })
          .eq("evolution_instance_name", instanceName);

        if (error) {
          console.error("❌ Error setting connected:", error.message);
        } else {
          console.log(`✅ ${instanceName} is now connected`);
        }
      } else if (state === "close" || state === "disconnected") {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected", qr_code: null })
          .eq("evolution_instance_name", instanceName);

        if (error) {
          console.error("❌ Error setting disconnected:", error.message);
        } else {
          console.log(`⚠️ ${instanceName} disconnected`);
        }
      }
    } else {
      console.log(`ℹ️ Unhandled event: ${eventType}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
