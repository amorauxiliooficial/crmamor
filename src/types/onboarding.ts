export interface OnboardingItem {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: 'treinamento' | 'documentacao' | 'geral';
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgresso {
  id: string;
  user_id: string;
  item_id: string;
  concluido: boolean;
  concluido_em?: string;
  created_at: string;
  updated_at: string;
}
