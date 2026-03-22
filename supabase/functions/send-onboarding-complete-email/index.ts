import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

import { buildCorsHeaders } from "../_shared/cors.ts";

interface OnboardingCompleteRequest {
  user_id: string;
  user_name: string;
  user_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { user_id, user_name, user_email }: OnboardingCompleteRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Send email to user
    const userEmailResponse = await resend.emails.send({
      from: "AAM <notificacoes@amorauxiliomaternidade.com.br>",
      to: [user_email],
      subject: "🎉 Parabéns! Você completou o Onboarding!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">🎉 Parabéns, ${user_name || 'Colaborador'}!</h1>
          <p style="font-size: 16px; color: #333;">Você completou com sucesso todo o processo de onboarding!</p>
          <p style="font-size: 16px; color: #333;">Agora você está pronto(a) para utilizar todas as funcionalidades do sistema.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0; color: #0369a1;"><strong>Próximos passos:</strong></p>
            <ul style="color: #0369a1; margin-top: 10px;">
              <li>Explore o sistema e suas funcionalidades</li>
              <li>Em caso de dúvidas, consulte o Playbook</li>
              <li>Entre em contato com seu supervisor se precisar de ajuda</li>
            </ul>
          </div>
          <p style="font-size: 14px; color: #666;">Bom trabalho!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Este é um email automático. Por favor, não responda.</p>
        </div>
      `,
    });

    console.log("User email sent:", userEmailResponse);

    // Get admin emails
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
    }

    if (adminRoles && adminRoles.length > 0) {
      const adminUserIds = adminRoles.map(r => r.user_id);
      
      const { data: adminProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .in("id", adminUserIds);

      if (profilesError) {
        console.error("Error fetching admin profiles:", profilesError);
      }

      if (adminProfiles && adminProfiles.length > 0) {
        const adminEmails = adminProfiles.filter(p => p.email).map(p => p.email);
        
        if (adminEmails.length > 0) {
          const adminEmailResponse = await resend.emails.send({
            from: "AAM <notificacoes@amorauxiliomaternidade.com.br>",
            to: adminEmails,
            subject: `✅ ${user_name || 'Colaborador'} completou o Onboarding`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #22c55e;">✅ Onboarding Concluído</h1>
                <p style="font-size: 16px; color: #333;">O colaborador <strong>${user_name || 'Novo Colaborador'}</strong> completou todo o processo de onboarding.</p>
                <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
                  <p style="margin: 0; color: #166534;"><strong>Detalhes:</strong></p>
                  <ul style="color: #166534; margin-top: 10px;">
                    <li>Nome: ${user_name || 'Não informado'}</li>
                    <li>Email: ${user_email}</li>
                    <li>Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</li>
                  </ul>
                </div>
                <p style="font-size: 14px; color: #666;">O colaborador está pronto para iniciar suas atividades.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #999;">Este é um email automático. Por favor, não responda.</p>
              </div>
            `,
          });

          console.log("Admin emails sent:", adminEmailResponse);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-onboarding-complete-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
