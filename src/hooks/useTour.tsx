import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const TOUR_STORAGE_KEY = "aam_tour_completed";

interface TourStep {
  target: string;
  content: string;
  title?: string;
  disableBeacon?: boolean;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const tourSteps: TourStep[] = [
  {
    target: ".tour-logo",
    title: "Bem-vindo ao AAM! 👋",
    content: "Este é o sistema Amor Auxílio Maternidade. Vamos fazer um tour rápido pelas principais funcionalidades!",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: ".tour-search",
    title: "Busca Rápida 🔍",
    content: "Busque mães pelo nome ou CPF. A busca é instantânea e funciona em qualquer visualização.",
    placement: "bottom",
  },
  {
    target: ".tour-add-mae",
    title: "Cadastrar Nova Mãe ➕",
    content: "Clique aqui para cadastrar uma nova mãe. Preencha dados pessoais, tipo de evento (parto, adoção, guarda) e informações previdenciárias.",
    placement: "bottom",
  },
  {
    target: ".tour-playbook",
    title: "Playbook de Vendas 📖",
    content: "Acesse scripts de atendimento, respostas para objeções e perguntas frequentes. Você pode favoritar, copiar e adicionar novas entradas.",
    placement: "bottom",
  },
  {
    target: ".tour-onboarding",
    title: "Onboarding 📋",
    content: "Seus treinamentos, documentos e acessos a sistemas ficam aqui. Complete todas as tarefas para estar 100% preparado!",
    placement: "bottom",
  },
  {
    target: ".tour-notifications",
    title: "Notificações de Indicações 🔔",
    content: "Indicações com ações pendentes ou vencidas aparecem aqui. Clique para ir direto à indicação e registrar o follow-up.",
    placement: "bottom",
  },
  {
    target: ".tour-stats",
    title: "Painel de Estatísticas 📊",
    content: "Resumo dos seus processos: total, aprovadas, indeferidas, em análise, pendências e gestantes. Clique em qualquer card para filtrar os processos.",
    placement: "bottom",
  },
  {
    target: ".tour-view-toggle",
    title: "Abas de Visualização 👁️",
    content: "Alterne entre diferentes visualizações: Processos (Kanban), Tabela, Gestantes, Conferência INSS, Pagamentos e Indicações.",
    placement: "bottom",
  },
  {
    target: ".tour-view-kanban",
    title: "Quadro Kanban 📋",
    content: "Arraste os cards entre colunas para atualizar o status. Cada coluna representa uma etapa do processo.",
    placement: "bottom",
  },
  {
    target: ".tour-view-table",
    title: "Visualização em Tabela 📑",
    content: "Veja todos os processos em formato de lista com mais detalhes visíveis.",
    placement: "bottom",
  },
  {
    target: ".tour-view-gestantes",
    title: "Acompanhamento de Gestantes 🤰",
    content: "Quadro específico de gestantes organizado por mês de gestação. Ideal para acompanhar DPPs.",
    placement: "bottom",
  },
  {
    target: ".tour-view-conferencia",
    title: "Conferência INSS ✅",
    content: "Registre verificações diárias no portal do INSS. Acompanhe atualizações nos processos.",
    placement: "bottom",
  },
  {
    target: ".tour-view-pagamentos",
    title: "Controle de Pagamentos 💰",
    content: "Gerencie honorários, cadastre valores, parcelas e acompanhe o status de cada pagamento.",
    placement: "bottom",
  },
  {
    target: ".tour-view-indicacoes",
    title: "Gestão de Indicações 👥",
    content: "Gerencie leads, registre indicadoras, agende follow-ups e acompanhe status de abordagens.",
    placement: "bottom",
  },
  {
    target: ".tour-user-menu",
    title: "Menu do Usuário 👤",
    content: "Clique aqui para ver suas informações e sair do sistema. Você finalizou o tour! 🎉",
    placement: "left",
  },
];

export function useTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if tour was completed
  const isTourCompleted = useCallback(() => {
    if (!user) return true;
    const completedUsers = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || "[]");
    return completedUsers.includes(user.id);
  }, [user]);

  // Mark tour as completed
  const completeTour = useCallback(() => {
    if (!user) return;
    const completedUsers = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || "[]");
    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedUsers));
    }
  }, [user]);

  // Start tour
  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  // Stop tour
  const stopTour = useCallback(() => {
    setRun(false);
    completeTour();
  }, [completeTour]);

  // Reset tour (for testing)
  const resetTour = useCallback(() => {
    if (!user) return;
    const completedUsers = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || "[]");
    const filtered = completedUsers.filter((id: string) => id !== user.id);
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(filtered));
  }, [user]);

  // Auto-start tour for new users
  useEffect(() => {
    if (user && !isTourCompleted()) {
      // Small delay to ensure all elements are rendered
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isTourCompleted, startTour]);

  return {
    run,
    stepIndex,
    setStepIndex,
    startTour,
    stopTour,
    resetTour,
    isTourCompleted,
    completeTour,
    steps: tourSteps,
  };
}
