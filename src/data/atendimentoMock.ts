export interface Conversa {
  id: string;
  nome: string | null;
  telefone: string;
  ultimaMensagem: string;
  horario: string;
  status: "aberto" | "pendente" | "fechado";
  atendente: string | null;
  naoLidas: number;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  remetente: "contato" | "atendente";
  texto: string;
  horario: string;
}

export const conversasMock: Conversa[] = [
  {
    id: "1",
    nome: "João Silva",
    telefone: "(11) 99999-1111",
    ultimaMensagem: "Oi, gostaria de saber sobre o produto...",
    horario: "14:32",
    status: "aberto",
    atendente: "Maria",
    naoLidas: 0,
  },
  {
    id: "2",
    nome: "Fernanda Costa",
    telefone: "(11) 98888-2222",
    ultimaMensagem: "Já fiz o pagamento, quando chega?",
    horario: "13:45",
    status: "pendente",
    atendente: "Você",
    naoLidas: 0,
  },
  {
    id: "3",
    nome: null,
    telefone: "(11) 97777-3333",
    ultimaMensagem: "Olá!",
    horario: "12:10",
    status: "aberto",
    atendente: null,
    naoLidas: 3,
  },
  {
    id: "4",
    nome: "Carlos Mendes",
    telefone: "(11) 96666-4444",
    ultimaMensagem: "Ok, obrigado!",
    horario: "Ontem",
    status: "fechado",
    atendente: "João",
    naoLidas: 0,
  },
  {
    id: "5",
    nome: "Ana Lima",
    telefone: "(11) 95555-5555",
    ultimaMensagem: "Preciso cancelar meu pedido",
    horario: "11:20",
    status: "aberto",
    atendente: null,
    naoLidas: 1,
  },
];

export const mensagensMock: Record<string, Mensagem[]> = {
  "1": [
    { id: "m1", conversaId: "1", remetente: "contato", texto: "Oi, gostaria de saber sobre o produto que vi no Instagram", horario: "14:20" },
    { id: "m2", conversaId: "1", remetente: "atendente", texto: "Olá João! Claro, qual produto você viu?", horario: "14:22" },
    { id: "m3", conversaId: "1", remetente: "contato", texto: "O kit maternidade completo", horario: "14:25" },
    { id: "m4", conversaId: "1", remetente: "atendente", texto: "Ótima escolha! O kit inclui tudo que a mamãe precisa. Posso te enviar mais detalhes?", horario: "14:28" },
    { id: "m5", conversaId: "1", remetente: "contato", texto: "Oi, gostaria de saber sobre o produto...", horario: "14:32" },
  ],
  "2": [
    { id: "m6", conversaId: "2", remetente: "contato", texto: "Bom dia! Fiz o pagamento ontem", horario: "13:00" },
    { id: "m7", conversaId: "2", remetente: "atendente", texto: "Bom dia Fernanda! Vou verificar o status do seu pagamento", horario: "13:05" },
    { id: "m8", conversaId: "2", remetente: "atendente", texto: "Confirmado! Seu pagamento foi processado com sucesso", horario: "13:15" },
    { id: "m9", conversaId: "2", remetente: "contato", texto: "Já fiz o pagamento, quando chega?", horario: "13:45" },
  ],
  "3": [
    { id: "m10", conversaId: "3", remetente: "contato", texto: "Olá!", horario: "12:10" },
  ],
  "4": [
    { id: "m11", conversaId: "4", remetente: "contato", texto: "Boa tarde, recebi o produto certinho", horario: "Ontem" },
    { id: "m12", conversaId: "4", remetente: "atendente", texto: "Que bom! Ficamos felizes. Qualquer dúvida estamos à disposição!", horario: "Ontem" },
    { id: "m13", conversaId: "4", remetente: "contato", texto: "Ok, obrigado!", horario: "Ontem" },
  ],
  "5": [
    { id: "m14", conversaId: "5", remetente: "contato", texto: "Oi, preciso cancelar meu pedido", horario: "11:15" },
    { id: "m15", conversaId: "5", remetente: "contato", texto: "Preciso cancelar meu pedido", horario: "11:20" },
  ],
};
