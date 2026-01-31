export type StatusProcesso =
  | "⚠️ Pendência Documental"
  | "🟡 Elegível (Análise Positiva)"
  | "⏳ Aguardando Análise INSS"
  | "✅ Aprovada"
  | "❌ Indeferida"
  | "⚖️ Recurso / Judicial"
  | "💳 Inadimplência"
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
  "📦 Processo Encerrado",
];

export const STATUS_COLORS: Record<StatusProcesso, string> = {
  "⚠️ Pendência Documental": "bg-accent",
  "🟡 Elegível (Análise Positiva)": "bg-chart-1/30",
  "⏳ Aguardando Análise INSS": "bg-chart-3/30",
  "✅ Aprovada": "bg-emerald-500/20",
  "❌ Indeferida": "bg-destructive/20",
  "⚖️ Recurso / Judicial": "bg-chart-5/30",
  "💳 Inadimplência": "bg-orange-500/20",
  "📦 Processo Encerrado": "bg-muted",
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
  "📦 Processo Encerrado": "—",
};
