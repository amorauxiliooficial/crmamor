export type StatusProspeccao =
  | "novo"
  | "em_contato"
  | "qualificado"
  | "sem_interesse"
  | "sem_resposta"
  | "convertido";

export interface Prospeccao {
  id: string;
  nome: string;
  telefone: string;
  telefone_e164?: string | null;
  mes_gestacao?: number | null;
  origem?: string | null;
  status: StatusProspeccao;
  observacoes?: string | null;
  proxima_acao?: string | null;
  proxima_acao_data?: string | null;
  mae_processo_id?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const statusProspeccaoLabels: Record<StatusProspeccao, string> = {
  novo: "Novo",
  em_contato: "Em Contato",
  qualificado: "Qualificado",
  sem_interesse: "Sem Interesse",
  sem_resposta: "Sem Resposta",
  convertido: "Convertido",
};

export const statusProspeccaoColors: Record<StatusProspeccao, string> = {
  novo: "bg-muted text-muted-foreground",
  em_contato: "bg-accent text-accent-foreground",
  qualificado: "bg-primary/20 text-primary",
  sem_interesse: "bg-secondary text-secondary-foreground",
  sem_resposta: "bg-muted text-muted-foreground",
  convertido: "bg-secondary text-secondary-foreground",
};
