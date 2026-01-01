export type StatusAbordagem = 
  | "pendente" 
  | "em_andamento" 
  | "concluido";

export type ProximaAcao = 
  | "primeiro_contato" 
  | "follow_up" 
  | "proxima_acao";

export interface Indicacao {
  id: string;
  data_indicacao: string;
  nome_indicada: string;
  telefone_indicada?: string;
  nome_indicadora?: string;
  telefone_indicadora?: string;
  status_abordagem: StatusAbordagem;
  motivo_abordagem?: string;
  observacoes?: string;
  proxima_acao?: ProximaAcao;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const statusAbordagemLabels: Record<StatusAbordagem, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

export const statusAbordagemColors: Record<StatusAbordagem, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  concluido: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

export const proximaAcaoLabels: Record<ProximaAcao, string> = {
  primeiro_contato: "Primeiro Contato",
  follow_up: "Follow Up",
  proxima_acao: "Próxima Ação",
};

export const proximaAcaoColors: Record<ProximaAcao, string> = {
  primeiro_contato: "bg-primary text-primary-foreground hover:bg-primary/90",
  follow_up: "bg-amber-500 text-white hover:bg-amber-600",
  proxima_acao: "bg-blue-500 text-white hover:bg-blue-600",
};
