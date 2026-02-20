import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API_VERSION = 'v21.0';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate user
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const userId = claimsData.claims.sub;

  // Admin client for DB operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { to, text, conversation_id } = await req.json();

    if (!to || !text) {
      return new Response(JSON.stringify({ error: 'Missing "to" or "text"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const META_WA_TOKEN = Deno.env.get("META_WA_TOKEN");
    const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

    if (!META_WA_TOKEN || !META_PHONE_NUMBER_ID) {
      console.error('❌ Missing META_WA_TOKEN or META_PHONE_NUMBER_ID');
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing Meta credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number (remove + if present, keep digits only)
    const cleanPhone = to.replace(/\D/g, '');

    console.log(`📤 Sending to +${cleanPhone}: ${text.slice(0, 80)}`);
    console.log(`🔑 Using PHONE_NUMBER_ID: ${META_PHONE_NUMBER_ID}`);
    console.log(`🔑 Token prefix: ${META_WA_TOKEN.slice(0, 20)}...`);

    // Call Meta Cloud API
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      }
    );

    const metaBody = await metaRes.json();
    console.log(`📡 Meta API response (${metaRes.status}):`, JSON.stringify(metaBody).slice(0, 300));

    if (!metaRes.ok) {
      const metaError = metaBody?.error;
      console.error(`❌ Meta API error ${metaRes.status}: code=${metaError?.code}, subcode=${metaError?.error_subcode}, msg=${metaError?.message}`);
      
      let userMessage = 'Meta API error';
      if (metaError?.error_subcode === 33 || metaError?.code === 100) {
        userMessage = `Invalid META_PHONE_NUMBER_ID (${META_PHONE_NUMBER_ID}) or token lacks permissions. Verify credentials in Meta for Developers.`;
      }
      
      return new Response(JSON.stringify({ error: userMessage, details: metaBody }), {
        status: metaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metaMsgId = metaBody.messages?.[0]?.id ?? null;

    // Resolve or create conversation
    let convoId = conversation_id;

    if (!convoId) {
      // Find or create conversation by phone
      const { data: existing } = await adminClient
        .from('wa_conversations')
        .select('id')
        .eq('wa_phone', cleanPhone)
        .maybeSingle();

      if (existing) {
        convoId = existing.id;
      } else {
        const { data: newConvo, error: newErr } = await adminClient
          .from('wa_conversations')
          .insert({ wa_phone: cleanPhone, status: 'open' })
          .select('id')
          .single();
        if (newErr) throw newErr;
        convoId = newConvo.id;
      }
    }

    // Save outbound message
    await adminClient.from('wa_messages').insert({
      conversation_id: convoId,
      meta_message_id: metaMsgId,
      direction: 'out',
      body: text,
      msg_type: 'text',
      status: 'sent',
      sent_by: userId,
    });

    // Update conversation
    await adminClient.from('wa_conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 200),
    }).eq('id', convoId);

    console.log(`✅ Message sent. Meta ID: ${metaMsgId}, Conversation: ${convoId}`);

    return new Response(JSON.stringify({ success: true, meta_message_id: metaMsgId, conversation_id: convoId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Send error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
