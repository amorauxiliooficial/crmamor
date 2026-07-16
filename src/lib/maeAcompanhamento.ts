import { differenceInCalendarDays, parseISO } from "date-fns";
import { MaeProcesso, StatusProcesso } from "@/types/mae";

const ETAPAS_COM_ACOMPANHAMENTO: readonly StatusProcesso[] = [
  "🤰 Gestantes 1 a 8 meses",
  "📥 Entradas do Mês",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
];

export const isAcompanhamentoAplicavel = (status: StatusProcesso) =>
  ETAPAS_COM_ACOMPANHAMENTO.includes(status);

const diasDesde = (data?: string | null) => {
  if (!data) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), parseISO(data)));
};

export const getAcompanhamentoMae = (mae: MaeProcesso) => {
  const aplicavel = isAcompanhamentoAplicavel(mae.status_processo);
  const referenciaCadastro = mae.created_at || mae.data_ultima_atualizacao;
  const diasSemContato = diasDesde(mae.ultimo_contato_em || referenciaCadastro);
  const diasSemSenha = mae.senha_gov ? 0 : diasDesde(referenciaCadastro);

  return {
    aplicavel,
    diasSemContato,
    diasSemSenha,
    contatoAtrasado: aplicavel && diasSemContato >= 7,
    senhaAtrasada: aplicavel && !mae.senha_gov && diasSemSenha >= 7,
    nuncaContatada: !mae.ultimo_contato_em,
  };
};

export const formatarTempo = (dias: number) =>
  dias === 0 ? "hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
