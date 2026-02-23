export type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
