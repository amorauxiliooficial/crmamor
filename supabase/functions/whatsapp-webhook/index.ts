import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get("META_WA_VERIFY_TOKEN");

  // GET = Meta webhook verification (challenge)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified successfully');
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    console.warn('❌ Webhook verification failed', { mode, token });
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  // POST = incoming messages & status updates
  if (req.method === 'POST') {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
      const body = await req.json();
      console.log('📩 Webhook payload:', JSON.stringify(body).slice(0, 500));

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Process incoming messages
      if (value?.messages) {
        for (const message of value.messages) {
          const phone = message.from; // E.164 without +
          const metaMsgId = message.id;
          const contactName = value.contacts?.[0]?.profile?.name ?? null;
          const textBody = message.text?.body ?? message.caption ?? `[${message.type}]`;
          const msgType = message.type ?? 'text';

          console.log(`📨 Message from +${phone} (${contactName}): ${textBody.slice(0, 80)}`);

          // Upsert conversation
          const { data: convo, error: convoErr } = await supabase
            .from('wa_conversations')
            .upsert({
              wa_phone: phone,
              wa_name: contactName,
              last_message_at: new Date().toISOString(),
              last_message_preview: textBody.slice(0, 200),
              status: 'open',
            }, { onConflict: 'wa_phone' })
            .select('id, unread_count')
            .single();

          if (convoErr) {
            console.error('❌ Conversation upsert error:', convoErr);
            continue;
          }

          // Dedup check by meta_message_id
          if (metaMsgId) {
            const { data: existingMsg } = await supabase
              .from('wa_messages')
              .select('id')
              .eq('meta_message_id', metaMsgId)
              .maybeSingle();
            if (existingMsg) {
              console.log(`⏭️ Duplicate message ${metaMsgId}, skipping`);
              continue;
            }
          }

          // Insert message
          const { error: msgErr } = await supabase
            .from('wa_messages')
            .insert({
              conversation_id: convo.id,
              meta_message_id: metaMsgId,
              direction: 'in',
              body: textBody,
              msg_type: msgType,
              status: 'delivered',
            });

          if (msgErr) {
            console.error('❌ Message insert error:', msgErr);
            continue;
          }

          // Update unread count
          await supabase
            .from('wa_conversations')
            .update({ unread_count: (convo.unread_count ?? 0) + 1 })
            .eq('id', convo.id);

          console.log(`✅ Saved message ${metaMsgId} in conversation ${convo.id}`);
        }
      }

      // Process status updates (sent/delivered/read/failed)
      if (value?.statuses) {
        for (const st of value.statuses) {
          const metaMsgId = st.id;
          const newStatus = st.status; // sent | delivered | read | failed

          console.log(`📊 Status update: ${metaMsgId} → ${newStatus}`);

          const { error } = await supabase
            .from('wa_messages')
            .update({ status: newStatus })
            .eq('meta_message_id', metaMsgId);

          if (error) {
            console.error('❌ Status update error:', error);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
