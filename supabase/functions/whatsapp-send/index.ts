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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const userId = claimsData.claims.sub;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { to, text, conversation_id, type, media_url, media_mime, media_filename, caption } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const META_WA_TOKEN = Deno.env.get("META_WA_TOKEN");
    const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

    if (!META_WA_TOKEN || !META_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing Meta credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanPhone = to.replace(/\D/g, '');
    const msgType = type || 'text';

    console.log(`📤 Sending ${msgType} to +${cleanPhone}`);

    // Build Meta API payload
    let metaPayload: Record<string, unknown>;

    if (msgType === 'text') {
      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing "text" for text message' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: text },
      };
    } else if (msgType === 'image') {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'image',
        image: { link: media_url, caption: caption || undefined },
      };
    } else if (msgType === 'video') {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'video',
        video: { link: media_url, caption: caption || undefined },
      };
    } else if (msgType === 'audio') {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'audio',
        audio: { link: media_url },
      };
    } else if (msgType === 'document') {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'document',
        document: { link: media_url, filename: media_filename || 'document', caption: caption || undefined },
      };
    } else {
      return new Response(JSON.stringify({ error: `Unsupported message type: ${msgType}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaBody = await metaRes.json();
    console.log(`📡 Meta API response (${metaRes.status}):`, JSON.stringify(metaBody).slice(0, 300));

    if (!metaRes.ok) {
      const metaError = metaBody?.error;
      console.error(`❌ Meta API error ${metaRes.status}: code=${metaError?.code}, msg=${metaError?.message}`);
      return new Response(JSON.stringify({ error: 'Meta API error', details: metaBody }), {
        status: metaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metaMsgId = metaBody.messages?.[0]?.id ?? null;

    if (!metaMsgId) {
      console.error('❌ Meta did not return wamid');
      return new Response(JSON.stringify({ error: 'Meta did not return message ID', details: metaBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve or create conversation
    let convoId = conversation_id;
    if (!convoId) {
      const { data: existing } = await adminClient
        .from('wa_conversations').select('id').eq('wa_phone', cleanPhone).maybeSingle();
      if (existing) {
        convoId = existing.id;
      } else {
        const { data: newConvo, error: newErr } = await adminClient
          .from('wa_conversations').insert({ wa_phone: cleanPhone, status: 'open' }).select('id').single();
        if (newErr) throw newErr;
        convoId = newConvo.id;
      }
    }

    // Save outbound message with status=sent (Meta accepted it)
    const bodyText = msgType === 'text' ? text : (caption || `[${msgType}]`);
    await adminClient.from('wa_messages').insert({
      conversation_id: convoId,
      meta_message_id: metaMsgId,
      direction: 'out',
      body: bodyText,
      msg_type: msgType,
      status: 'sent',
      sent_by: userId,
      sent_at: new Date().toISOString(),
      media_url: msgType !== 'text' ? media_url : null,
      media_mime: media_mime || null,
      media_filename: media_filename || null,
    });

    // Update conversation
    await adminClient.from('wa_conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: bodyText.slice(0, 200),
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
