import type { TaskItem } from "./types";

export type TaskGroupHandlers = {
  onToggleDone: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onArchive: (task: TaskItem) => void;
  onMoveToToday: (task: TaskItem) => void;
};
