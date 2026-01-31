export type TipoAtividade = "ligacao" | "whatsapp" | "documento" | "anotacao";

export interface Atividade {
  id: string;
  mae_id: string;
  user_id: string;
  tipo_atividade: TipoAtividade;
  descricao?: string;
  data_atividade: string;
  created_at: string;
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
