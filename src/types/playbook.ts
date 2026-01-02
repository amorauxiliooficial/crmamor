export interface PlaybookCategoria {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookEntrada {
  id: string;
  categoria_id: string | null;
  pergunta: string;
  respostas: string[];
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  categoria?: PlaybookCategoria;
  is_favorito?: boolean;
}

export interface PlaybookFavorito {
  id: string;
  user_id: string;
  entrada_id: string;
  created_at: string;
}
