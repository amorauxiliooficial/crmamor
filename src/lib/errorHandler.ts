/**
 * Error handling utility to prevent database schema information leakage
 * Maps database errors to user-friendly messages in Portuguese
 */

export function getUserFriendlyError(error: any): string {
  const message = error?.message?.toLowerCase() || '';
  
  // Map database errors to user-friendly messages
  if (message.includes('duplicate') && message.includes('cpf')) {
    return 'Este CPF já está cadastrado no sistema.';
  }
  if (message.includes('duplicate')) {
    return 'Este registro já existe no sistema.';
  }
  if (message.includes('foreign key')) {
    return 'Não é possível realizar esta operação devido a dependências.';
  }
  if (message.includes('not-null constraint')) {
    return 'Campos obrigatórios não foram preenchidos.';
  }
  if (message.includes('violates check constraint') && message.includes('cpf')) {
    return 'CPF inválido. Verifique o número informado.';
  }
  if (message.includes('violates check constraint')) {
    return 'Os dados fornecidos não atendem aos requisitos.';
  }
  if (message.includes('permission denied') || message.includes('rls') || message.includes('policy')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  if (message.includes('timeout')) {
    return 'A operação demorou muito. Tente novamente.';
  }
  
  // Generic fallback - don't expose internal details
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
}

export function logError(context: string, error: any) {
  // Log full error details for debugging (server-side/console only)
  console.error(`[${context}]`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}
