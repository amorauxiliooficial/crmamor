export type TipoAtividade = "ligacao" | "whatsapp" | "documento" | "anotacao";

export type ResultadoContato = 
  | "conseguiu_falar" 
  | "nao_atendeu" 
  | "ocupado" 
  | "deixou_recado" 
  | "avancou" 
  | "aguardando" 
  | "pendencia"
  | "finalizado";

export type StatusFollowUp = "pendente" | "agendado" | "concluido" | "cancelado";

export interface Atividade {
  id: string;
  mae_id: string;
  user_id: string;
  tipo_atividade: TipoAtividade;
  descricao?: string | null;
  data_atividade: string;
  created_at: string;
  // CRM fields
  resultado_contato?: ResultadoContato | null;
  proxima_acao?: TipoAtividade | null;
  data_proxima_acao?: string | null;
  status_followup?: StatusFollowUp | null;
  concluido?: boolean;
  concluido_em?: string | null;
}

export interface ConfigPrazoStatus {
  id: string;
  status_processo: string;
  dias_limite: number;
  created_at: string;
  updated_at: string;
}

export const TIPO_ATIVIDADE_LABELS: Record<TipoAtividade, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  documento: "Documento",
  anotacao: "Anotação",
};

export const TIPO_ATIVIDADE_ICONS: Record<TipoAtividade, string> = {
  ligacao: "Phone",
  whatsapp: "MessageCircle",
  documento: "FileText",
  anotacao: "StickyNote",
};

export const RESULTADO_CONTATO_LABELS: Record<ResultadoContato, string> = {
  conseguiu_falar: "✅ Conseguiu falar",
  nao_atendeu: "📵 Não atendeu",
  ocupado: "⏳ Ocupada/Indisponível",
  deixou_recado: "💬 Deixou recado",
  avancou: "🚀 Avançou no processo",
  aguardando: "⏸️ Aguardando retorno",
  pendencia: "⚠️ Pendência identificada",
  finalizado: "🏁 Caso finalizado",
};

export const STATUS_FOLLOWUP_LABELS: Record<StatusFollowUp, string> = {
  pendente: "Pendente",
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
