import { differenceInMonths, parseISO } from "date-fns";
import type { MaeProcesso } from "@/types/mae";

/**
 * Retorna o mês gestacional atual da mãe (1–9), calculado dinamicamente.
 *
 * Estratégia:
 * 1. Se houver DPP (`data_evento_tipo === "DPP"`), calcula a partir dela —
 *    mais preciso e sempre atualizado com a passagem do tempo.
 * 2. Caso contrário, usa `mes_gestacao` armazenado como o mês informado no
 *    momento do cadastro (`created_at`) e avança conforme os meses decorridos.
 *
 * Retorna null se não houver informação suficiente ou se a gestação já passou.
 */
export function calcularMesGravidez(mae: MaeProcesso): number | null {
  if (!mae.is_gestante) return null;

  const hoje = new Date();

  // 1) Cálculo via DPP (mais preciso)
  if (mae.data_evento && mae.data_evento_tipo === "DPP") {
    const dpp = parseISO(mae.data_evento);
    const diasDesdeParto = Math.floor((hoje.getTime() - dpp.getTime()) / (1000 * 60 * 60 * 24));
    if (diasDesdeParto > 30) return null;
    if (dpp < hoje) return 9;
    const mesesAteParto = differenceInMonths(dpp, hoje);
    return Math.max(1, Math.min(9, 9 - mesesAteParto));
  }

  // 2) Cálculo via mês informado no cadastro + tempo decorrido
  if (mae.mes_gestacao !== null && mae.mes_gestacao !== undefined) {
    const baseDate = mae.created_at ? parseISO(mae.created_at) : null;
    if (!baseDate || isNaN(baseDate.getTime())) {
      return mae.mes_gestacao;
    }
    const mesesDecorridos = Math.max(0, differenceInMonths(hoje, baseDate));
    const atual = mae.mes_gestacao + mesesDecorridos;
    if (atual > 9) return null; // gestação já deve ter terminado
    return Math.min(9, atual);
  }

  return null;
}

/**
 * Retorna true quando a mãe está no 7º ou 8º mês gestacional —
 * janela crítica para entrar em contato antes de virar caso operacional.
 */
export function isGestanteCritica(mae: MaeProcesso): boolean {
  const m = calcularMesGravidez(mae);
  return m === 7 || m === 8;
}
