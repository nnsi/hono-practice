export type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type GroupedTasks = {
  overdue: TaskItem[];
  dueToday: TaskItem[];
  startingToday: TaskItem[];
  inProgress: TaskItem[];
  dueThisWeek: TaskItem[];
  notStarted: TaskItem[];
  future: TaskItem[];
  completed: TaskItem[];
};
