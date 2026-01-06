export interface OnboardingItem {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: 'treinamento' | 'documentacao' | 'geral';
  tipo: 'checklist' | 'video' | 'documento' | 'assinatura' | 'acesso_sistema';
  ordem: number;
  ativo: boolean;
  url_video?: string;
  arquivo_url?: string;
  requer_assinatura: boolean;
  tempo_estimado?: number; // em minutos
  login_sistema?: string;
  senha_sistema?: string;
  url_sistema?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgresso {
  id: string;
  user_id: string;
  item_id: string;
  concluido: boolean;
  concluido_em?: string;
  assinado_em?: string;
  documento_assinado_url?: string;
  created_at: string;
  updated_at: string;
}
