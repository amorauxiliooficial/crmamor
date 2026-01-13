export interface Banco {
  id: string;
  nome: string;
  endereco: string;
  cidade?: string;
  uf?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateComunicado {
  id: string;
  nome: string;
  conteudo: string;
  ativo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
