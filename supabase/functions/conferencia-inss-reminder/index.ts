import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

import { buildCorsHeaders } from "../_shared/cors.ts";

// Recipients for INSS conference reminders
const RECIPIENTS = [
  "rhuan@amorauxiliomaternidade.com.br",
  "bruno@amorauxiliomaternidade.com.br",
];

const CONFERENCIA_INTERVALO_DIAS = 2;

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting INSS conference reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all mothers "Em Análise"
    const { data: maesData, error: maesError } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, status_processo, data_ultima_atualizacao")
      .eq("status_processo", "Em Análise")
      .order("data_ultima_atualizacao", { ascending: true });

    if (maesError) {
      console.error("Error fetching maes:", maesError);
      throw maesError;
    }

    console.log(`Found ${maesData?.length || 0} mothers in analysis`);

    if (!maesData || maesData.length === 0) {
      return new Response(
        JSON.stringify({ message: "No mothers in analysis", sent: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check last conference for each mother
    const now = new Date();
    const pendingConferences: Array<{
      id: string;
      nome_mae: string;
      cpf: string;
      dias_sem_conferencia: number;
      ultima_conferencia: string | null;
    }> = [];

    for (const mae of maesData) {
      const { data: confData } = await supabase
        .from("conferencia_inss")
        .select("created_at")
        .eq("mae_id", mae.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const ultimaConferencia = confData?.created_at;
      let diasSemConferencia = 999;

      if (ultimaConferencia) {
        const lastDate = new Date(ultimaConferencia);
        diasSemConferencia = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      if (diasSemConferencia >= CONFERENCIA_INTERVALO_DIAS) {
        pendingConferences.push({
          id: mae.id,
          nome_mae: mae.nome_mae,
          cpf: mae.cpf,
          dias_sem_conferencia: diasSemConferencia,
          ultima_conferencia: ultimaConferencia || null,
        });
      }
    }

    console.log(`Found ${pendingConferences.length} pending conferences`);

    if (pendingConferences.length === 0) {
      return new Response(
        JSON.stringify({ message: "All conferences are up to date", sent: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sort by days without conference (most urgent first)
    pendingConferences.sort((a, b) => b.dias_sem_conferencia - a.dias_sem_conferencia);

    // Format CPF
    const formatCpf = (cpf: string) => {
      const clean = cpf.replace(/\D/g, "");
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    // Build email content
    const conferenceRows = pendingConferences
      .map((p) => {
        const statusClass = p.dias_sem_conferencia >= 5 ? "color: #dc2626;" : p.dias_sem_conferencia >= 3 ? "color: #ea580c;" : "color: #ca8a04;";
        const statusText = p.dias_sem_conferencia >= 999 ? "Nunca conferido" : `${p.dias_sem_conferencia} dia(s)`;
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${p.nome_mae}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${formatCpf(p.cpf)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${statusClass} font-weight: 600;">${statusText}</td>
          </tr>
        `;
      })
      .join("");

    const urgentCount = pendingConferences.filter(p => p.dias_sem_conferencia >= 5).length;
    const warningCount = pendingConferences.filter(p => p.dias_sem_conferencia >= 3 && p.dias_sem_conferencia < 5).length;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lembrete de Conferência INSS</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #6366f1; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📋 Conferência INSS Pendente</h1>
            </div>
            <div style="padding: 24px;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Olá! Existem <strong>${pendingConferences.length}</strong> processo(s) que precisam de conferência no INSS:
              </p>
              
              ${urgentCount > 0 ? `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                  <p style="margin: 0; color: #dc2626; font-weight: 600;">⚠️ ${urgentCount} processo(s) com mais de 5 dias sem conferência!</p>
                </div>
              ` : ''}
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Nome da Mãe</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">CPF</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Dias sem Conferência</th>
                  </tr>
                </thead>
                <tbody>
                  ${conferenceRows}
                </tbody>
              </table>
              
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  💡 <strong>Dica:</strong> Acesse o sistema e vá até a aba "Conferência" para registrar as atualizações.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Este é um lembrete automático do sistema AAM - Amor Auxílio Maternidade.
              </p>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                AAM - Amor Auxílio Maternidade
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "AAM <notificacoes@amorauxiliomaternidade.com.br>",
      to: RECIPIENTS,
      subject: `📋 ${pendingConferences.length} conferência(s) INSS pendente(s)${urgentCount > 0 ? ' ⚠️' : ''}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        message: "INSS conference reminder sent",
        sent: true,
        pendingCount: pendingConferences.length,
        urgentCount,
        warningCount,
        recipients: RECIPIENTS,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in conferencia-inss-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
