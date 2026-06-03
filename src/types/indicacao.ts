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
  aguardando_aprovacao: "bg-secondary text-secondary-foreground",
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-accent text-accent-foreground",
  concluido: "bg-secondary text-secondary-foreground",
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
  follow_up: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  proxima_acao: "bg-accent text-accent-foreground hover:bg-accent/80",
};
