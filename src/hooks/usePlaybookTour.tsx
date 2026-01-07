import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const PLAYBOOK_TOUR_STORAGE_KEY = "aam_playbook_tour_completed";

interface TourStep {
  target: string;
  content: string;
  title?: string;
  disableBeacon?: boolean;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const playbookTourSteps: TourStep[] = [
  {
    target: ".tour-playbook-header",
    title: "Playbook de Vendas 📖",
    content: "Bem-vindo ao Playbook! Aqui você encontra scripts, respostas para objeções e perguntas frequentes do dia a dia.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: ".tour-playbook-search",
    title: "Buscar no Playbook 🔍",
    content: "Busque por palavras-chave em perguntas, respostas ou tags. A busca ignora acentos e maiúsculas.",
    placement: "bottom",
  },
  {
    target: ".tour-playbook-favoritos",
    title: "Favoritos ⭐",
    content: "Clique aqui para filtrar apenas suas entradas favoritas. Marque as que você mais usa para acesso rápido!",
    placement: "bottom",
  },
  {
    target: ".tour-playbook-add",
    title: "Adicionar Entradas ➕",
    content: "Adicione novas perguntas e respostas manualmente ou importe várias de uma vez a partir de um arquivo.",
    placement: "left",
  },
  {
    target: ".tour-playbook-categories",
    title: "Categorias 📂",
    content: "Filtre as entradas por categoria. Cada aba mostra a quantidade de entradas disponíveis.",
    placement: "bottom",
  },
  {
    target: ".tour-playbook-card",
    title: "Cards de Perguntas 💬",
    content: "Cada card mostra uma pergunta e suas respostas. Clique para expandir, copiar respostas, favoritar, editar ou excluir.",
    placement: "top",
  },
];

export function usePlaybookTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if tour was completed
  const isTourCompleted = useCallback(() => {
    if (!user) return true;
    const completedUsers = JSON.parse(localStorage.getItem(PLAYBOOK_TOUR_STORAGE_KEY) || "[]");
    return completedUsers.includes(user.id);
  }, [user]);

  // Mark tour as completed
  const completeTour = useCallback(() => {
    if (!user) return;
    const completedUsers = JSON.parse(localStorage.getItem(PLAYBOOK_TOUR_STORAGE_KEY) || "[]");
    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(PLAYBOOK_TOUR_STORAGE_KEY, JSON.stringify(completedUsers));
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
    const completedUsers = JSON.parse(localStorage.getItem(PLAYBOOK_TOUR_STORAGE_KEY) || "[]");
    const filtered = completedUsers.filter((id: string) => id !== user.id);
    localStorage.setItem(PLAYBOOK_TOUR_STORAGE_KEY, JSON.stringify(filtered));
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
    steps: playbookTourSteps,
  };
}
