export type CategoriaDespesa = 
  | "fornecedor_servico"
  | "custo_operacional"
  | "comissao_parceiro"
  | "impostos"
  | "outros";

export type StatusTransacao = "pendente" | "pago" | "cancelado" | "atrasado";

export type TipoRecorrencia = "unica" | "mensal" | "trimestral" | "anual";

export interface Despesa {
  id: string;
  user_id: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: StatusTransacao;
  recorrencia: TipoRecorrencia;
  fornecedor?: string | null;
  observacoes?: string | null;
  comprovante_url?: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIA_LABELS: Record<CategoriaDespesa, string> = {
  fornecedor_servico: "Fornecedor/Serviço",
  custo_operacional: "Custo Operacional",
  comissao_parceiro: "Comissão Parceiro",
  impostos: "Impostos",
  outros: "Outros",
};

export const STATUS_LABELS: Record<StatusTransacao, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
  atrasado: "Atrasado",
};

export const RECORRENCIA_LABELS: Record<TipoRecorrencia, string> = {
  unica: "Única",
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};
