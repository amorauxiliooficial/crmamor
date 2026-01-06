export type StatusProcesso =
  | "📥 Entrada de Documentos"
  | "🔎 Em Análise"
  | "⚠️ Pendência Documental"
  | "🟡 Elegível (Análise Positiva)"
  | "📤 Protocolo INSS"
  | "⏳ Aguardando Análise INSS"
  | "✅ Aprovada"
  | "❌ Indeferida"
  | "⚖️ Recurso / Judicial"
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
  "📥 Entrada de Documentos",
  "🔎 Em Análise",
  "⚠️ Pendência Documental",
  "🟡 Elegível (Análise Positiva)",
  "📤 Protocolo INSS",
  "⏳ Aguardando Análise INSS",
  "✅ Aprovada",
  "❌ Indeferida",
  "⚖️ Recurso / Judicial",
  "📦 Processo Encerrado",
];

export const STATUS_COLORS: Record<StatusProcesso, string> = {
  "📥 Entrada de Documentos": "bg-secondary",
  "🔎 Em Análise": "bg-primary/20",
  "⚠️ Pendência Documental": "bg-accent",
  "🟡 Elegível (Análise Positiva)": "bg-chart-1/30",
  "📤 Protocolo INSS": "bg-chart-2/30",
  "⏳ Aguardando Análise INSS": "bg-chart-3/30",
  "✅ Aprovada": "bg-emerald-500/20",
  "❌ Indeferida": "bg-destructive/20",
  "⚖️ Recurso / Judicial": "bg-chart-5/30",
  "📦 Processo Encerrado": "bg-muted",
};
