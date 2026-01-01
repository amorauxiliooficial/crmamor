export type StatusAbordagem = 
  | "pendente" 
  | "em_contato" 
  | "interessada" 
  | "nao_interessada" 
  | "convertida" 
  | "sem_resposta";

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
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const statusAbordagemLabels: Record<StatusAbordagem, string> = {
  pendente: "Pendente",
  em_contato: "Em Contato",
  interessada: "Interessada",
  nao_interessada: "Não Interessada",
  convertida: "Convertida",
  sem_resposta: "Sem Resposta",
};

export const statusAbordagemColors: Record<StatusAbordagem, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_contato: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  interessada: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  nao_interessada: "bg-destructive/20 text-destructive",
  convertida: "bg-primary/20 text-primary",
  sem_resposta: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};
