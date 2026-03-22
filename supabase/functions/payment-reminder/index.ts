import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

import { buildCorsHeaders } from "../_shared/cors.ts";

// Recipients for payment reminders
const RECIPIENTS = [
  "rhuan@amorauxiliomaternidade.com.br",
  "bruno@amorauxiliomaternidade.com.br",
];

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting payment reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Checking for payments due on: ${tomorrowStr}`);

    // Get pending installments due tomorrow
    const { data: parcelas, error: parcelasError } = await supabase
      .from("parcelas_pagamento")
      .select(`
        id,
        numero_parcela,
        valor,
        data_pagamento,
        status,
        pagamento_id,
        pagamentos_mae!inner (
          id,
          mae_id,
          tipo_pagamento,
          valor_total,
          total_parcelas,
          mae_processo!inner (
            nome_mae,
            cpf
          )
        )
      `)
      .eq("data_pagamento", tomorrowStr)
      .eq("status", "pendente");

    if (parcelasError) {
      console.error("Error fetching parcelas:", parcelasError);
      throw parcelasError;
    }

    console.log(`Found ${parcelas?.length || 0} payments due tomorrow`);

    if (!parcelas || parcelas.length === 0) {
      return new Response(
        JSON.stringify({ message: "No payments due tomorrow", sent: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build email content
    const paymentRows = parcelas
      .map((p: any) => {
        const mae = p.pagamentos_mae?.mae_processo;
        const nomeMae = mae?.nome_mae || "N/A";
        const valor = p.valor
          ? new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(p.valor)
          : "N/A";
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${nomeMae}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Parcela ${p.numero_parcela}/${p.pagamentos_mae?.total_parcelas || "?"}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${valor}</td>
          </tr>
        `;
      })
      .join("");

    const totalValue = parcelas.reduce(
      (sum: number, p: any) => sum + (p.valor || 0),
      0
    );
    const totalFormatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(totalValue);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lembrete de Pagamentos</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #ec4899; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💰 Lembrete de Pagamentos</h1>
            </div>
            <div style="padding: 24px;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Olá! Os seguintes pagamentos estão agendados para <strong>amanhã (${new Date(tomorrowStr).toLocaleDateString("pt-BR")})</strong>:
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Nome da Mãe</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Parcela</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentRows}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb;">
                    <td colspan="2" style="padding: 12px; font-weight: 600; color: #374151;">Total</td>
                    <td style="padding: 12px; font-weight: 600; color: #ec4899;">${totalFormatted}</td>
                  </tr>
                </tfoot>
              </table>
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
      subject: `💰 Lembrete: ${parcelas.length} pagamento(s) amanhã - Total ${totalFormatted}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        message: "Payment reminder sent",
        sent: true,
        paymentsCount: parcelas.length,
        totalValue: totalFormatted,
        recipients: RECIPIENTS,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in payment-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
