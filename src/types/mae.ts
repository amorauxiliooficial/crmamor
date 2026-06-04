export type StatusProcesso =
  | "🤰 Gestantes 1 a 8 meses"
  | "📥 Entradas do Mês"
  | "⏳ Aguardando Análise INSS"
  | "✅ Aprovada"
  | "❌ Indeferida"
  | "⚖️ Recurso / Judicial"
  | "💳 Inadimplência"
  | "🤝 Renegociação"
  | "📄 Rescisão de Contrato"
  | "📦 Processo Encerrado";

export type TipoEvento = "Parto" | "Adoção" | "Guarda judicial";

export type DataEventoTipo = "Parto (real)" | "DPP" | "";

export type CategoriaPrevidenciaria =
  | "CLT"
  | "MEI"
  | "Contribuinte Individual"
  | "Desempregada"
  | "Não informado";

export interface MaeProcesso {
  id: string;
  user_id?: string;
  nome_mae: string;
  cpf: string;
  telefone?: string;
  email?: string;
  tipo_evento: TipoEvento;
  data_evento?: string;
  data_evento_tipo?: DataEventoTipo;
  categoria_previdenciaria: CategoriaPrevidenciaria;
  status_processo: StatusProcesso;
  /** Etapa anterior preservada após migração/movimentação de funil (rastreabilidade). */
  status_anterior?: string | null;
  protocolo_inss?: string;
  parcelas?: string;
  contrato_assinado: boolean;
  segurada?: string;
  precisa_gps?: string;
  uf?: string;
  observacoes?: string;
  origem?: string;
  senha_gov?: string;
  verificacao_duas_etapas: boolean;
  is_gestante: boolean;
  mes_gestacao?: number | null;
  data_ultima_atualizacao: string;
  created_at?: string;
  link_documentos?: string | null;
  cep?: string | null;
  precisa_das: boolean;
  das_concluido: boolean;
  ja_trabalhou?: boolean;
}

export interface ChecklistMae {
  id: string;
  mae_id: string;
  qualidade_segurada: boolean;
  carencia_cumprida: boolean;
  prazo_legal_ok: boolean;
  documentos_completos: boolean;
  checklist_status: "OK" | "Incompleto";
}

export interface DecisaoProcesso {
  id: string;
  mae_id: string;
  resultado_final: "APROVADA" | "REPROVADA" | null;
  motivo_decisao?: string;
  observacoes_internas?: string;
}

export const STATUS_ORDER: StatusProcesso[] = [
  "🤰 Gestantes 1 a 8 meses",
  "📥 Entradas do Mês",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
  "❌ Indeferida",
  "⚖️ Recurso / Judicial",
  "💳 Inadimplência",
  "🤝 Renegociação",
  "📄 Rescisão de Contrato",
  "📦 Processo Encerrado",
];

// Stages considered "concluded/archived" for display purposes only.
// Every other stage is treated as ACTIVE ("Em andamento").
export const CONCLUDED_STAGES: StatusProcesso[] = ["📦 Processo Encerrado"];

// Stages considered "denied / closed without success" — also out of active funnel.
export const DENIED_STAGES: StatusProcesso[] = ["❌ Indeferida"];

export const isConcludedStage = (status: StatusProcesso) =>
  CONCLUDED_STAGES.includes(status);

export const isDeniedStage = (status: StatusProcesso) =>
  DENIED_STAGES.includes(status);

export const isOutOfFunnel = (status: StatusProcesso) =>
  isConcludedStage(status) || isDeniedStage(status);

// Placeholder helper text shown under each column title (exact copy TBD).
export const STATUS_NEXT_ACTION: Record<StatusProcesso, string> = {
  "🤰 Gestantes 1 a 8 meses": "Ação: ...",
  "📥 Entradas do Mês": "Ação: ...",
  "⏳ Aguardando Análise INSS": "Ação: ...",
  "✅ Aprovada": "Ação: ...",
  "❌ Indeferida": "Ação: ...",
  "⚖️ Recurso / Judicial": "Ação: ...",
  "💳 Inadimplência": "Ação: ...",
  "🤝 Renegociação": "Ação: ...",
  "📄 Rescisão de Contrato": "Ação: ...",
  "📦 Processo Encerrado": "Ação: ...",
};

export const STATUS_COLORS: Record<StatusProcesso, string> = {
  "🤰 Gestantes 1 a 8 meses": "bg-muted/60",
  "📥 Entradas do Mês": "bg-muted/60",
  "⏳ Aguardando Análise INSS": "bg-muted/60",
  "✅ Aprovada": "bg-muted/60",
  "❌ Indeferida": "bg-muted/60",
  "⚖️ Recurso / Judicial": "bg-muted/60",
  "💳 Inadimplência": "bg-muted/60",
  "🤝 Renegociação": "bg-muted/60",
  "📄 Rescisão de Contrato": "bg-muted/60",
  "📦 Processo Encerrado": "bg-muted/60",
};

// Thin top-bar accent colors per status (used as border-top on column headers)
export const STATUS_BAR_COLORS: Record<StatusProcesso, string> = {
  "🤰 Gestantes 1 a 8 meses": "border-t-pink-500/60",
  "📥 Entradas do Mês": "border-t-amber-500/60",
  "⏳ Aguardando Análise INSS": "border-t-sky-500/50",
  "✅ Aprovada": "border-t-emerald-500/60",
  "❌ Indeferida": "border-t-destructive/50",
  "⚖️ Recurso / Judicial": "border-t-violet-500/50",
  "💳 Inadimplência": "border-t-orange-500/50",
  "🤝 Renegociação": "border-t-fuchsia-500/50",
  "📄 Rescisão de Contrato": "border-t-rose-500/50",
  "📦 Processo Encerrado": "border-t-muted-foreground/30",
};

// Prazos de follow-up para exibição na UI (em dias)
export const FOLLOWUP_PRAZO_LABELS: Record<StatusProcesso, string> = {
  "🤰 Gestantes 1 a 8 meses": "1x/mês",
  "📥 Entradas do Mês": "1x/semana",
  "⏳ Aguardando Análise INSS": "15 dias",
  "✅ Aprovada": "1 dia",
  "❌ Indeferida": "3→15→60→90d",
  "⚖️ Recurso / Judicial": "3→15→60→90d",
  "💳 Inadimplência": "1 dia (único)",
  "🤝 Renegociação": "3 dias",
  "📄 Rescisão de Contrato": "3 dias",
  "📦 Processo Encerrado": "—",
};
