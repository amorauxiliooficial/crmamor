export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type TaskCategory = "bug" | "melhoria" | "nova_funcionalidade" | "ajuste";
export type TaskStatus = "backlog" | "priorizado" | "em_progresso" | "concluido";

export interface TarefaInterna {
  id: string;
  titulo: string;
  descricao?: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  categoria: TaskCategory;
  responsavel_id?: string | null;
  prazo?: string | null;
  ordem: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Timestamps for time tracking per column
  backlog_at?: string | null;
  priorizado_at?: string | null;
  em_progresso_at?: string | null;
  concluido_at?: string | null;
  // Image for reference
  imagem_url?: string | null;
}

export interface TarefaResponsavel {
  id: string;
  tarefa_id: string;
  user_id: string;
  created_at: string;
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "priorizado",
  "em_progresso",
  "concluido",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "📥 Backlog",
  priorizado: "⭐ Priorizado",
  em_progresso: "🔄 Em Progresso",
  concluido: "✅ Concluído",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "bg-muted/50",
  priorizado: "bg-amber-100/50 dark:bg-amber-900/20",
  em_progresso: "bg-blue-100/50 dark:bg-blue-900/20",
  concluido: "bg-green-100/50 dark:bg-green-900/20",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgente: "bg-destructive/10 text-destructive",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  bug: "🐛 Bug",
  melhoria: "✨ Melhoria",
  nova_funcionalidade: "🚀 Nova Funcionalidade",
  ajuste: "🔧 Ajuste",
};

export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  melhoria: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  nova_funcionalidade: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ajuste: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

// Helper to get the timestamp field for a given status
export const STATUS_TIMESTAMP_FIELD: Record<TaskStatus, keyof TarefaInterna> = {
  backlog: "backlog_at",
  priorizado: "priorizado_at",
  em_progresso: "em_progresso_at",
  concluido: "concluido_at",
};
