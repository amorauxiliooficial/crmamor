export type StatusProcesso =
  | "⚠️ Pendência Documental"
  | "🟡 Elegível (Análise Positiva)"
  | "⏳ Aguardando Análise INSS"
  | "✅ Aprovada"
  | "❌ Indeferida"
  | "⚖️ Recurso / Judicial"
  | "💳 Inadimplência"
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
  link_documentos?: string | null;
  cep?: string | null;
  precisa_das: boolean;
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
  "⚠️ Pendência Documental",
  "🟡 Elegível (Análise Positiva)",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
  "❌ Indeferida",
  "⚖️ Recurso / Judicial",
  "💳 Inadimplência",
  "📄 Rescisão de Contrato",
  "📦 Processo Encerrado",
];

export const STATUS_COLORS: Record<StatusProcesso, string> = {
  "⚠️ Pendência Documental": "bg-muted/60",
  "🟡 Elegível (Análise Positiva)": "bg-muted/60",
  "⏳ Aguardando Análise INSS": "bg-muted/60",
  "✅ Aprovada": "bg-muted/60",
  "❌ Indeferida": "bg-muted/60",
  "⚖️ Recurso / Judicial": "bg-muted/60",
  "💳 Inadimplência": "bg-muted/60",
  "📄 Rescisão de Contrato": "bg-muted/60",
  "📦 Processo Encerrado": "bg-muted/60",
};

// Thin top-bar accent colors per status (used as border-top on column headers)
export const STATUS_BAR_COLORS: Record<StatusProcesso, string> = {
  "⚠️ Pendência Documental": "border-t-amber-500/60",
  "🟡 Elegível (Análise Positiva)": "border-t-primary/60",
  "⏳ Aguardando Análise INSS": "border-t-sky-500/50",
  "✅ Aprovada": "border-t-emerald-500/60",
  "❌ Indeferida": "border-t-destructive/50",
  "⚖️ Recurso / Judicial": "border-t-violet-500/50",
  "💳 Inadimplência": "border-t-orange-500/50",
  "📄 Rescisão de Contrato": "border-t-rose-500/50",
  "📦 Processo Encerrado": "border-t-muted-foreground/30",
};

// Prazos de follow-up para exibição na UI (em dias)
export const FOLLOWUP_PRAZO_LABELS: Record<StatusProcesso, string> = {
  "⚠️ Pendência Documental": "1x/semana",
  "🟡 Elegível (Análise Positiva)": "1x/semana",
  "⏳ Aguardando Análise INSS": "15 dias",
  "✅ Aprovada": "1 dia",
  "❌ Indeferida": "3→15→60→90d",
  "⚖️ Recurso / Judicial": "3→15→60→90d",
  "💳 Inadimplência": "1 dia (único)",
  "📄 Rescisão de Contrato": "3 dias",
  "📦 Processo Encerrado": "—",
};
