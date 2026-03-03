export interface Conversa {
  id: string;
  nome: string | null;
  telefone: string;
  ultimaMensagem: string;
  horario: Date;
  status: "Aberto" | "Pendente" | "Fechado";
  atendente: string | null;
  assignedAgentId: string | null;
  naoLidas: number;
  etiquetas: string[];
  prioridade?: "normal" | "alta";
  slaMinutos?: number;
  maeId?: string | null;
  lastInboundAt?: Date | null;
  queueStatus?: "sem_responsavel" | "em_atendimento" | "aguardando_cliente" | "resolvido";
}

export interface Mensagem {
  id: string;
  texto: string;
  de: "contato" | "atendente";
  horario: Date;
  msgType?: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaFilename?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  status?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metaMessageId?: string | null;
  sentByAgentId?: string | null;
  sentByAgentName?: string | null;
  editedAt?: string | null;
  editedByAgentId?: string | null;
}

export const mockConversas: Conversa[] = [
  { id: "1", nome: "João Silva", telefone: "(11) 99999-1111", ultimaMensagem: "Oi, gostaria de saber sobre o produto...", horario: new Date(Date.now() - 5 * 60000), status: "Aberto", atendente: "Maria", naoLidas: 0, etiquetas: ["Suporte"] },
  { id: "2", nome: "Fernanda Costa", telefone: "(11) 98888-2222", ultimaMensagem: "Já fiz o pagamento, quando chega?", horario: new Date(Date.now() - 25 * 60000), status: "Pendente", atendente: "Você", naoLidas: 2, etiquetas: ["Financeiro"] },
  { id: "3", nome: null, telefone: "(11) 97777-3333", ultimaMensagem: "Olá!", horario: new Date(Date.now() - 45 * 60000), status: "Aberto", atendente: null, naoLidas: 3, etiquetas: [] },
  { id: "4", nome: "Carlos Mendes", telefone: "(11) 96666-4444", ultimaMensagem: "Ok, obrigado!", horario: new Date(Date.now() - 120 * 60000), status: "Fechado", atendente: "João", naoLidas: 0, etiquetas: [] },
  { id: "5", nome: "Ana Lima", telefone: "(11) 95555-5555", ultimaMensagem: "Preciso cancelar meu pedido urgente", horario: new Date(Date.now() - 2 * 60000), status: "Aberto", atendente: null, naoLidas: 1, etiquetas: ["Urgente"] },
];

export const mockMensagens: Record<string, Mensagem[]> = {
  "1": [
    { id: "m1", texto: "Oi, gostaria de saber sobre o produto...", de: "contato", horario: new Date(Date.now() - 10 * 60000) },
    { id: "m2", texto: "Olá João! Claro, pode perguntar 😊", de: "atendente", horario: new Date(Date.now() - 8 * 60000) },
    { id: "m3", texto: "Quero saber sobre valores e prazos", de: "contato", horario: new Date(Date.now() - 5 * 60000) },
  ],
  "2": [
    { id: "m1", texto: "Boa tarde! Fiz o pagamento agora pouco", de: "contato", horario: new Date(Date.now() - 30 * 60000) },
    { id: "m2", texto: "Já identifiquei seu pagamento ✅", de: "atendente", horario: new Date(Date.now() - 28 * 60000) },
    { id: "m3", texto: "Já fiz o pagamento, quando chega?", de: "contato", horario: new Date(Date.now() - 25 * 60000) },
  ],
  "3": [
    { id: "m1", texto: "Olá!", de: "contato", horario: new Date(Date.now() - 45 * 60000) },
  ],
  "4": [
    { id: "m1", texto: "Tudo resolvido! Muito obrigado", de: "contato", horario: new Date(Date.now() - 125 * 60000) },
    { id: "m2", texto: "Fico feliz em ajudar! Qualquer dúvida é só chamar 👋", de: "atendente", horario: new Date(Date.now() - 122 * 60000) },
    { id: "m3", texto: "Ok, obrigado pelo atendimento!", de: "contato", horario: new Date(Date.now() - 120 * 60000) },
  ],
  "5": [
    { id: "m1", texto: "Preciso cancelar meu pedido urgente", de: "contato", horario: new Date(Date.now() - 2 * 60000) },
  ],
};
