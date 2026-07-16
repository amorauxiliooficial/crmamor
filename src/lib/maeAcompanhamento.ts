import { differenceInCalendarDays, parseISO } from "date-fns";
import { MaeProcesso } from "@/types/mae";

const diasDesde = (data?: string | null) => {
  if (!data) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), parseISO(data)));
};

export const getAcompanhamentoMae = (mae: MaeProcesso) => {
  const referenciaCadastro = mae.created_at || mae.data_ultima_atualizacao;
  const diasSemContato = diasDesde(mae.ultimo_contato_em || referenciaCadastro);
  const diasSemSenha = mae.senha_gov ? 0 : diasDesde(referenciaCadastro);

  return {
    diasSemContato,
    diasSemSenha,
    contatoAtrasado: diasSemContato >= 7,
    senhaAtrasada: !mae.senha_gov && diasSemSenha >= 7,
    nuncaContatada: !mae.ultimo_contato_em,
  };
};

export const formatarTempo = (dias: number) =>
  dias === 0 ? "hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
