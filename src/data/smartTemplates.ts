export interface SmartTemplate {
  id: string;
  label: string;
  emoji: string;
  texto: string;
  actions?: {
    createFollowUp?: { tipo: string; descricao: string; diasProxima?: number };
    updateChecklist?: { field: string; value: boolean };
    timelineEvent?: { type: string; title: string };
  };
}

export const smartTemplates: SmartTemplate[] = [
  {
    id: "docs",
    label: "Documentos",
    emoji: "📎",
    texto: "Para darmos continuidade, precisamos dos seguintes documentos:\n\n• CNIS atualizado\n• Certidão de nascimento\n• Comprovante de residência\n• Carteira de trabalho\n\nVocê pode enviar fotos ou PDF pelo próprio WhatsApp. 📄",
    actions: {
      createFollowUp: { tipo: "Cobrança documental", descricao: "Aguardando envio de documentos", diasProxima: 3 },
      timelineEvent: { type: "docs_requested", title: "Documentos solicitados ao contato" },
    },
  },
  {
    id: "prazos",
    label: "Prazos",
    emoji: "⏳",
    texto: "Sobre os prazos:\n\n• Análise interna: 2-3 dias úteis\n• Protocolo INSS: após documentação completa\n• Prazo INSS: 30-45 dias após protocolo\n\nAcompanharemos todo o processo juntos! 📋",
    actions: {
      timelineEvent: { type: "info_sent", title: "Informações de prazos enviadas" },
    },
  },
  {
    id: "pagamento",
    label: "Pagamento",
    emoji: "💳",
    texto: "Seu pagamento foi identificado com sucesso! ✅\n\nEm até 2 dias úteis o processo será atualizado no sistema. Obrigada pela confiança!",
    actions: {
      createFollowUp: { tipo: "Verificação pagamento", descricao: "Confirmar atualização pós-pagamento", diasProxima: 2 },
      timelineEvent: { type: "payment_confirmed", title: "Pagamento confirmado ao contato" },
    },
  },
  {
    id: "como_enviar",
    label: "Como enviar docs",
    emoji: "📲",
    texto: "Para enviar seus documentos:\n\n1️⃣ Tire uma foto nítida de cada documento\n2️⃣ Envie aqui pelo WhatsApp ou por e-mail\n3️⃣ Certifique-se que as informações estão legíveis\n\nSe preferir, pode enviar em PDF! 📎",
    actions: {
      timelineEvent: { type: "instructions_sent", title: "Instruções de envio de docs" },
    },
  },
];
