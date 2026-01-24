export type StatusPreAnalise = 
  | "aprovada"
  | "aprovada_com_ressalvas"
  | "nao_aprovavel"
  | "erro_processamento";

export type CategoriaSeguraraAnalise =
  | "empregada_clt"
  | "contribuinte_individual"
  | "mei"
  | "desempregada"
  | "segurada_especial"
  | "facultativa";

export type MotivoReanalise =
  | "primeiro_registro"
  | "documento_novo"
  | "correcao_dados"
  | "atualizacao_cnis"
  | "solicitacao_manual";

export interface RiscoIdentificado {
  tipo: string;
  descricao: string;
  gravidade: "alta" | "media" | "baixa";
}

export interface DadosEntradaAnalise {
  categoria_segurada: CategoriaSeguraraAnalise | string;
  data_evento: string;
  tipo_evento: string;
  data_ultima_contribuicao?: string;
  quantidade_contribuicoes?: number;
  vinculos_ativos?: string[];
  vinculos_inativos?: string[];
  gaps_contribuicao?: string[];
  documentos_anexados?: string[];
  observacoes_adicionais?: string;
  dados_cnis?: string;
}

export interface PreAnalise {
  id: string;
  mae_id: string;
  user_id: string;
  dados_entrada: DadosEntradaAnalise;
  status_analise: StatusPreAnalise;
  categoria_identificada?: string;
  carencia_status?: string;
  periodo_graca_status?: string;
  situacao_cnis?: string;
  riscos_identificados: RiscoIdentificado[];
  conclusao_detalhada?: string;
  recomendacoes: string[];
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
  aprovada: "Aprovada",
  aprovada_com_ressalvas: "Aprovada com Ressalvas",
  nao_aprovavel: "Não Aprovável",
  erro_processamento: "Erro no Processamento",
};

export const STATUS_ANALISE_COLORS: Record<StatusPreAnalise, string> = {
  aprovada: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  aprovada_com_ressalvas: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  nao_aprovavel: "bg-destructive/20 text-destructive",
  erro_processamento: "bg-muted text-muted-foreground",
};

export const MOTIVO_REANALISE_LABELS: Record<MotivoReanalise, string> = {
  primeiro_registro: "Primeiro Registro",
  documento_novo: "Documento Novo",
  correcao_dados: "Correção de Dados",
  atualizacao_cnis: "Atualização CNIS",
  solicitacao_manual: "Solicitação Manual",
};

export const CATEGORIA_SEGURADA_OPTIONS = [
  { value: "empregada_clt", label: "Empregada CLT" },
  { value: "contribuinte_individual", label: "Contribuinte Individual" },
  { value: "mei", label: "MEI" },
  { value: "desempregada", label: "Desempregada" },
  { value: "segurada_especial", label: "Segurada Especial" },
  { value: "facultativa", label: "Facultativa" },
];
