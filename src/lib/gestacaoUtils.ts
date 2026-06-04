import { differenceInMonths, parseISO } from "date-fns";
import type { MaeProcesso } from "@/types/mae";

/**
 * Retorna o mês gestacional atual da mãe (1–9).
 * Prioriza `mes_gestacao` informado manualmente; caso contrário,
 * calcula a partir da DPP (`data_evento` + `data_evento_tipo === "DPP"`).
 * Retorna null se não houver informação suficiente.
 */
export function calcularMesGravidez(mae: MaeProcesso): number | null {
  if (!mae.is_gestante) return null;

  if (mae.mes_gestacao !== null && mae.mes_gestacao !== undefined) {
    return mae.mes_gestacao;
  }

  if (!mae.data_evento || mae.data_evento_tipo !== "DPP") return null;

  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();

  const diasDesdeParto = Math.floor((hoje.getTime() - dpp.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDesdeParto > 30) return null;
  if (dpp < hoje) return 9;

  const mesesAteParto = differenceInMonths(dpp, hoje);
  return Math.max(1, Math.min(9, 9 - mesesAteParto));
}

/**
 * Retorna true quando a mãe está no 7º ou 8º mês gestacional —
 * janela crítica para entrar em contato antes de virar caso operacional.
 */
export function isGestanteCritica(mae: MaeProcesso): boolean {
  const m = calcularMesGravidez(mae);
  return m === 7 || m === 8;
}

/**
 * Calcula o mês gestacional atual de um lead/prospecção, avançando
 * automaticamente conforme o tempo decorrido desde a data de cadastro.
 * Retorna null se passar de 9 (gestação provavelmente já terminou).
 */
export function calcularMesGestacaoProspeccao(
  mesRegistrado: number | null | undefined,
  createdAt: string | null | undefined,
): number | null {
  if (mesRegistrado === null || mesRegistrado === undefined) return null;
  if (!createdAt) return mesRegistrado;
  const base = parseISO(createdAt);
  if (isNaN(base.getTime())) return mesRegistrado;
  const mesesDecorridos = Math.max(0, differenceInMonths(new Date(), base));
  const atual = mesRegistrado + mesesDecorridos;
  if (atual > 9) return null;
  return Math.min(9, atual);
}
