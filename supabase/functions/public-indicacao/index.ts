import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { publicCorsHeaders as corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Received public indication:', body);

    // Validate required fields
    const { nome_indicada, telefone_indicada, nome_indicadora, telefone_indicadora } = body;

    if (!nome_indicada || nome_indicada.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nome da indicada é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nome_indicada.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: 'Nome da indicada muito longo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (optional but if provided, must be valid)
    if (telefone_indicada && telefone_indicada.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check for duplicate indication (same phone number for indicada)
    if (telefone_indicada && telefone_indicada.trim().length > 0) {
      // Normalize phone number for comparison (remove non-digits)
      const normalizedPhone = telefone_indicada.replace(/\D/g, '');
      
      // Check if this phone already exists in indicacoes
      const { data: existingIndicacoes, error: checkError } = await supabaseAdmin
        .from('indicacoes')
        .select('id, nome_indicada, telefone_indicada')
        .not('telefone_indicada', 'is', null);

      if (checkError) {
        console.error('Error checking for duplicates:', checkError);
      } else if (existingIndicacoes && existingIndicacoes.length > 0) {
        // Check if any existing indication has the same normalized phone
        const isDuplicate = existingIndicacoes.some((ind) => {
          if (!ind.telefone_indicada) return false;
          const existingNormalized = ind.telefone_indicada.replace(/\D/g, '');
          return existingNormalized === normalizedPhone;
        });

        if (isDuplicate) {
          console.log('Duplicate indication attempt blocked for phone:', telefone_indicada);
          return new Response(
            JSON.stringify({ 
              error: 'Esta pessoa já foi indicada anteriormente. Obrigado pelo interesse!',
              duplicate: true 
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get a system user ID (first admin user) or use a placeholder
    const { data: adminUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);

    const systemUserId = adminUsers?.[0]?.user_id;

    if (!systemUserId) {
      console.error('No admin user found for system attribution');
      return new Response(
        JSON.stringify({ error: 'Sistema não configurado corretamente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the indication with special status and origin
    const { data: indicacao, error: insertError } = await supabaseAdmin
      .from('indicacoes')
      .insert({
        nome_indicada: nome_indicada.trim(),
        telefone_indicada: telefone_indicada?.trim() || null,
        nome_indicadora: nome_indicadora?.trim() || null,
        telefone_indicadora: telefone_indicadora?.trim() || null,
        status_abordagem: 'aguardando_aprovacao',
        origem_indicacao: 'externa',
        user_id: systemUserId,
        observacoes: 'Indicação recebida via formulário público'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting indication:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar indicação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin
      .from('acoes_indicacao')
      .insert({
        indicacao_id: indicacao.id,
        tipo_acao: 'Indicação recebida via formulário público',
        user_id: systemUserId
      });

    console.log('Public indication created successfully:', indicacao.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Indicação registrada com sucesso!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing public indication:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});