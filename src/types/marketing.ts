export interface TipoConteudo {
  id: string;
  nome: string;
  cor: string;
  plataforma: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Criativo {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo_conteudo_id?: string | null;
  tipo_instagram: 'feed' | 'stories' | 'reels';
  data_postagem: string;
  horario_postagem?: string | null;
  legenda?: string | null;
  arquivo_url?: string | null;
  status: 'agendado' | 'postado' | 'cancelado';
  user_id: string;
  created_at: string;
  updated_at: string;
  tipo_conteudo?: TipoConteudo | null;
}

export type TipoInstagram = 'feed' | 'stories' | 'reels';
