export interface RespostaRapida {
  id: string;
  atalho: string;
  titulo: string;
  texto: string;
}

export const respostasRapidas: RespostaRapida[] = [
  { id: "1", atalho: "saudacao", titulo: "Saudação", texto: "Olá! Seja bem-vindo ao nosso atendimento. Como posso te ajudar hoje? 😊" },
  { id: "2", atalho: "pagamento", titulo: "Pagamento", texto: "Seu pagamento foi identificado com sucesso! Em até 2 dias úteis o processo será atualizado. ✅" },
  { id: "3", atalho: "prazo", titulo: "Prazo de análise", texto: "O prazo médio de análise pelo INSS é de 30 a 45 dias após o protocolo. Acompanharemos juntos! 📋" },
  { id: "4", atalho: "pendencia", titulo: "Pendência documental", texto: "Identificamos uma pendência nos seus documentos. Por favor, nos envie os documentos solicitados para darmos continuidade. 📎" },
  { id: "5", atalho: "aprovado", titulo: "Aprovação", texto: "Temos uma ótima notícia! Seu benefício foi APROVADO! 🎉 Em breve você receberá mais detalhes sobre os próximos passos." },
  { id: "6", atalho: "aguarde", titulo: "Aguardar", texto: "Vou verificar as informações do seu processo e já retorno para você. Um momento! ⏳" },
  { id: "7", atalho: "encerrar", titulo: "Encerramento", texto: "Foi um prazer te atender! Caso precise de mais alguma coisa, é só nos chamar. Até mais! 👋" },
];
