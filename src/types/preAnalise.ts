export type StatusPreAnalise = 
  | "APROVADA"
  | "APROVADA_COM_RESSALVAS"
  | "NAO_APROVAVEL"
  | "ERRO_PROCESSAMENTO";

// Status simplificado para atendente (sem interpretar regras)
export type ResultadoAtendente = "APROVADO" | "REPROVADO" | "JURIDICO";

// Próxima ação padronizada
export type ProximaAcaoAnalise = 
  | "PROTOCOLO_INSS"      // Pode protocolar direto
  | "ENCAMINHAR_JURIDICO" // Precisa análise jurídica
  | "SOLICITAR_DOCS";     // Falta documentação

export type CategoriaSeguraraAnalise =
  | "empregada"
  | "desempregada"
  | "mei"
  | "individual"
  | "facultativa"
  | "rural";

export type TipoEvento = "parto" | "adocao" | "aborto_legal";

export type MotivoReanalise =
  | "primeiro_registro"
  | "documento_novo"
  | "correcao_dados"
  | "atualizacao_cnis"
  | "solicitacao_manual";

export type NivelRisco = "ALERTA" | "BLOQUEIO";

export type StatusDocumento = "OK" | "FALTA";

// Documentos anexados
export interface DocumentosAnexados {
  cnis: boolean;
  ctps: boolean;
  certidao: boolean;
  comprov_endereco: boolean;
  outros: string[];
}

// JSON de ENTRADA padronizado
export interface DadosEntradaAnalise {
  case_id?: string;
  cpf: string;
  nome: string;
  categoria: CategoriaSeguraraAnalise | string;
  gestante: boolean;
  evento: TipoEvento | string;
  data_evento: string;
  ultimo_vinculo_data_fim?: string;
  total_contribuicoes: number;
  teve_120_contribuicoes: boolean;
  recebeu_seguro_desemprego: boolean;
  mei_ativo: boolean;
  competencias_em_atraso: boolean;
  documentos: DocumentosAnexados;
  observacoes_atendente?: string;
}

// Estruturas de resposta da IA
export interface CarenciaAnalise {
  exigida: boolean;
  regra: string;
  cumprida: boolean;
  detalhe: string;
}

export interface PeriodoGracaAnalise {
  regra: string;
  data_limite: string;
  dentro: boolean;
  detalhe: string;
}

export interface CnisAnalise {
  ok: boolean;
  pontos_de_atencao: string[];
}

export interface RiscoIdentificado {
  nivel: NivelRisco;
  motivo: string;
}

export interface ChecklistDocumento {
  doc: string;
  status: StatusDocumento;
}

// Resposta simplificada para atendente (sem interpretar regras)
export interface RespostaAtendente {
  resultado_atendente: ResultadoAtendente;
  motivo_curto: string;
  proxima_acao: ProximaAcaoAnalise;
}

// JSON de SAÍDA padronizado
export interface RespostaAnaliseIA {
  status: StatusPreAnalise;
  categoria_identificada: string;
  carencia: CarenciaAnalise;
  periodo_de_graca: PeriodoGracaAnalise;
  cnis: CnisAnalise;
  riscos: RiscoIdentificado[];
  conclusao: string;
  checklist_documentos: ChecklistDocumento[];
}

// Registro completo de pré-análise
export interface PreAnalise {
  id: string;
  mae_id: string;
  user_id: string;
  dados_entrada: DadosEntradaAnalise;
  status_analise: StatusPreAnalise;
  categoria_identificada?: string;
  carencia?: CarenciaAnalise;
  periodo_de_graca?: PeriodoGracaAnalise;
  cnis?: CnisAnalise;
  riscos: RiscoIdentificado[];
  conclusao?: string;
  checklist_documentos?: ChecklistDocumento[];
  // Campos simplificados para atendente
  resultado_atendente?: ResultadoAtendente;
  motivo_curto?: string;
  proxima_acao?: ProximaAcaoAnalise;
  // Metadata
  versao: number;
  motivo_reanalise: MotivoReanalise;
  observacao_reanalise?: string;
  resposta_ia_raw?: unknown;
  modelo_ia_utilizado?: string;
  tokens_utilizados?: number;
  created_at: string;
  processado_em?: string;
}

export const STATUS_ANALISE_LABELS: Record<StatusPreAnalise, string> = {
  APROVADA: "Aprovada",
  APROVADA_COM_RESSALVAS: "Aprovada com Ressalvas",
  NAO_APROVAVEL: "Não Aprovável",
  ERRO_PROCESSAMENTO: "Erro no Processamento",
};

export const STATUS_ANALISE_COLORS: Record<StatusPreAnalise, string> = {
  APROVADA: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  APROVADA_COM_RESSALVAS: "bg-chart-1/20 text-chart-1",
  NAO_APROVAVEL: "bg-destructive/20 text-destructive",
  ERRO_PROCESSAMENTO: "bg-muted text-muted-foreground",
};

export const RESULTADO_ATENDENTE_LABELS: Record<ResultadoAtendente, string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  JURIDICO: "Encaminhar Jurídico",
};

export const RESULTADO_ATENDENTE_COLORS: Record<ResultadoAtendente, string> = {
  APROVADO: "bg-emerald-500 text-white",
  REPROVADO: "bg-destructive text-destructive-foreground",
  JURIDICO: "bg-chart-1 text-white",
};

export const PROXIMA_ACAO_LABELS: Record<ProximaAcaoAnalise, string> = {
  PROTOCOLO_INSS: "Protocolar no INSS",
  ENCAMINHAR_JURIDICO: "Encaminhar para Jurídico",
  SOLICITAR_DOCS: "Solicitar Documentos",
};

export const MOTIVO_REANALISE_LABELS: Record<MotivoReanalise, string> = {
  primeiro_registro: "Primeiro Registro",
  documento_novo: "Documento Novo",
  correcao_dados: "Correção de Dados",
  atualizacao_cnis: "Atualização CNIS",
  solicitacao_manual: "Solicitação Manual",
};

export const CATEGORIA_SEGURADA_OPTIONS = [
  { value: "empregada", label: "Empregada CLT" },
  { value: "desempregada", label: "Desempregada" },
  { value: "mei", label: "MEI" },
  { value: "individual", label: "Contribuinte Individual" },
  { value: "facultativa", label: "Facultativa" },
  { value: "rural", label: "Segurada Especial (Rural)" },
];

export const TIPO_EVENTO_OPTIONS = [
  { value: "parto", label: "Parto" },
  { value: "adocao", label: "Adoção" },
  { value: "aborto_legal", label: "Aborto Legal" },
];
