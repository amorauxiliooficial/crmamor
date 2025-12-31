export type StatusParcela = "pendente" | "pago" | "inadimplente";

export type TipoPagamento = "a_vista" | "parcelado";

export interface PagamentoMae {
  id: string;
  mae_id: string;
  user_id: string;
  tipo_pagamento: TipoPagamento;
  total_parcelas: number;
  created_at: string;
  updated_at: string;
}

export interface ParcelaPagamento {
  id: string;
  pagamento_id: string;
  numero_parcela: number;
  data_pagamento?: string;
  status: StatusParcela;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PagamentoCompleto extends PagamentoMae {
  parcelas: ParcelaPagamento[];
  mae?: {
    nome_mae: string;
    cpf: string;
  };
}
