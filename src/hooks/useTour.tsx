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
    content: "Aqui você pode buscar mães pelo nome ou CPF. A busca é instantânea e funciona em qualquer tela.",
    placement: "bottom",
  },
  {
    target: ".tour-add-mae",
    title: "Cadastrar Nova Mãe ➕",
    content: "Clique aqui para cadastrar uma nova mãe no sistema. Você vai preencher todos os dados do processo.",
    placement: "bottom",
  },
  {
    target: ".tour-playbook",
    title: "Playbook 📖",
    content: "Acesse o Playbook para consultar perguntas frequentes, scripts de atendimento e documentação importante.",
    placement: "bottom",
  },
  {
    target: ".tour-onboarding",
    title: "Onboarding 📋",
    content: "Aqui você encontra seus treinamentos, documentos e acessos a sistemas. Complete todos para estar 100% preparado!",
    placement: "bottom",
  },
  {
    target: ".tour-notifications",
    title: "Notificações 🔔",
    content: "As indicações com ações pendentes aparecem aqui. Fique atento para não perder nenhum follow-up!",
    placement: "bottom",
  },
  {
    target: ".tour-stats",
    title: "Estatísticas 📊",
    content: "Veja um resumo dos seus processos. Clique em qualquer card para filtrar os processos por status.",
    placement: "bottom",
  },
  {
    target: ".tour-view-toggle",
    title: "Modos de Visualização 👁️",
    content: "Alterne entre diferentes visualizações: Kanban, Tabela, Gestantes, Conferência INSS, Pagamentos e Indicações.",
    placement: "bottom",
  },
  {
    target: ".tour-kanban",
    title: "Quadro Kanban 📋",
    content: "Arraste os cards entre as colunas para atualizar o status dos processos. Cada coluna representa uma etapa.",
    placement: "top",
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
