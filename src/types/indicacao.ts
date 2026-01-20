export type StatusAbordagem = 
  | "pendente" 
  | "em_andamento" 
  | "concluido"
  | "aguardando_aprovacao";

export type OrigemIndicacao = "interna" | "externa";

export type MotivoAbordagem = 
  | "sem_resposta" 
  | "sem_interesse" 
  | "fechou_contrato" 
  | "voltou_trabalhar";

export type ProximaAcao = 
  | "primeiro_contato" 
  | "follow_up" 
  | "proxima_acao";

export interface AcaoIndicacao {
  id: string;
  indicacao_id: string;
  tipo_acao: string;
  observacao?: string;
  user_id: string;
  created_at: string;
}

export interface Indicacao {
  id: string;
  data_indicacao: string;
  nome_indicada: string;
  telefone_indicada?: string;
  nome_indicadora?: string;
  telefone_indicadora?: string;
  status_abordagem: StatusAbordagem;
  motivo_abordagem?: MotivoAbordagem;
  observacoes?: string;
  proxima_acao?: ProximaAcao;
  proxima_acao_data?: string;
  proxima_acao_observacao?: string;
  origem_indicacao?: OrigemIndicacao;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const statusAbordagemLabels: Record<StatusAbordagem, string> = {
  aguardando_aprovacao: "Aguardando Aprovação",
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

export const statusAbordagemColors: Record<StatusAbordagem, string> = {
  aguardando_aprovacao: "bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30",
  pendente: "bg-muted text-muted-foreground hover:bg-muted/80",
  em_andamento: "bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30",
  concluido: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30",
};

export const origemIndicacaoLabels: Record<OrigemIndicacao, string> = {
  interna: "Interna",
  externa: "Externa",
};

export const origemIndicacaoColors: Record<OrigemIndicacao, string> = {
  interna: "bg-muted text-muted-foreground",
  externa: "bg-primary/20 text-primary",
};

export const motivoAbordagemLabels: Record<MotivoAbordagem, string> = {
  sem_resposta: "Sem resposta",
  sem_interesse: "Não tem interesse",
  fechou_contrato: "Fechou contrato",
  voltou_trabalhar: "Voltou a trabalhar",
};

export const proximaAcaoLabels: Record<ProximaAcao, string> = {
  primeiro_contato: "1º Contato",
  follow_up: "Follow Up",
  proxima_acao: "Próx. Ação",
};

export const proximaAcaoColors: Record<ProximaAcao, string> = {
  primeiro_contato: "bg-primary text-primary-foreground hover:bg-primary/90",
  follow_up: "bg-amber-500 text-white hover:bg-amber-600",
  proxima_acao: "bg-blue-500 text-white hover:bg-blue-600",
};
