export interface Fornecedor {
  id: string;
  user_id: string;
  nome: string;
  cnpj_cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
