-- Categoria própria para entradas automáticas originadas da Conferência INSS.
ALTER TYPE public.observacao_categoria
  ADD VALUE IF NOT EXISTS 'conferencia';
