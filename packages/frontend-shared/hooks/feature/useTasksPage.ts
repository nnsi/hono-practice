import { useEffect, useMemo, useState } from "react";

import dayjs, { type Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
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

export type TasksPageDependencies = {
  api: {
    getTasks: (params: { includeArchived: boolean }) => Promise<TaskItem[]>;
    getArchivedTasks: () => Promise<TaskItem[]>;
  };
};

export type TaskGroupingOptions = {
  showCompleted: boolean;
  showFuture: boolean;
  completedInTheirCategories?: boolean; // If true, completed tasks stay in their original categories
};

export function createUseTasksPage(dependencies: TasksPageDependencies) {
  const { api } = dependencies;

  // View state
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Data state
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<TaskItem[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isArchivedTasksLoading, setIsArchivedTasksLoading] = useState(false);

  // Fetch active tasks
  const fetchActiveTasks = async () => {
    setIsTasksLoading(true);
    try {
      const tasks = await api.getTasks({ includeArchived: false });
      setActiveTasks(tasks);
    } catch (error) {
      console.error("Failed to fetch active tasks:", error);
      setActiveTasks([]);
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Fetch archived tasks
  const fetchArchivedTasks = async () => {
    if (activeTab !== "archived") return;

    setIsArchivedTasksLoading(true);
    try {
      const tasks = await api.getArchivedTasks();
      setArchivedTasks(tasks);
    } catch (error) {
      console.error("Failed to fetch archived tasks:", error);
      setArchivedTasks([]);
    } finally {
      setIsArchivedTasksLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchActiveTasks();
  }, []);

  // Fetch archived tasks when tab changes
  useEffect(() => {
    if (activeTab === "archived") {
      void fetchArchivedTasks();
    }
  }, [activeTab]);

  // Select tasks based on active tab
  const tasks = activeTab === "active" ? activeTasks : undefined;

  // Group tasks by timeline with configurable options
  const groupedTasks = useMemo(() => {
    return groupTasksByTimeline(tasks || [], {
      showCompleted,
      showFuture,
      completedInTheirCategories: true, // Web版の動作を再現
    });
  }, [tasks, showCompleted, showFuture]);

  const hasAnyTasks = Object.values(groupedTasks).some(
    (group) => group.length > 0,
  );

  const hasAnyArchivedTasks = archivedTasks && archivedTasks.length > 0;

  return {
    // State
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    createDialogOpen,
    setCreateDialogOpen,
    activeTab,
    setActiveTab,

    // Data
    tasks,
    isTasksLoading,
    archivedTasks,
    isArchivedTasksLoading,
    groupedTasks,
    hasAnyTasks,
    hasAnyArchivedTasks,

    // Actions
    refetch: fetchActiveTasks,
    refetchArchived: fetchArchivedTasks,
  };
}

// Pure function for task grouping logic - can be used independently
export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: TaskGroupingOptions = {
    showCompleted: true,
    showFuture: true,
    completedInTheirCategories: false,
  },
): GroupedTasks {
  const today = dayjs().startOf("day");
  const nextWeek = today.add(7, "day");

  const groups: GroupedTasks = {
    overdue: [],
    dueToday: [],
    startingToday: [],
    inProgress: [],
    dueThisWeek: [],
    notStarted: [],
    future: [],
    completed: [],
  };

  tasks.forEach((task) => {
    const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
    const startDate = task.startDate ? dayjs(task.startDate) : null;

    // Handle completed tasks
    if (task.doneDate) {
      if (options.completedInTheirCategories) {
        // Web版の動作: 完了済みでも今日締切/今日開始のタスクはそのカテゴリに表示
        if (dueDate?.isSame(today, "day")) {
          groups.dueToday.push(task);
          return;
        }
        if (startDate?.isSame(today, "day")) {
          groups.startingToday.push(task);
          return;
        }
      }

      if (options.showCompleted) {
        groups.completed.push(task);
      }
      return;
    }

    // Categorize non-completed tasks
    if (dueDate?.isBefore(today)) {
      // Overdue
      groups.overdue.push(task);
    } else if (dueDate?.isSame(today, "day")) {
      // Due today
      groups.dueToday.push(task);
    } else if (
      startDate?.isSame(today, "day") &&
      (!dueDate || dueDate.isAfter(today))
    ) {
      // Starting today
      groups.startingToday.push(task);
    } else if (
      startDate?.isBefore(today) &&
      (!dueDate || dueDate.isAfter(today))
    ) {
      // In progress
      groups.inProgress.push(task);
    } else if (dueDate?.isAfter(today) && dueDate.isBefore(nextWeek)) {
      // Due this week
      groups.dueThisWeek.push(task);
    } else if (startDate?.isAfter(today)) {
      // Not started
      groups.notStarted.push(task);
    } else if (options.showFuture) {
      // Future tasks
      groups.future.push(task);
    }
  });

  // Sort each group
  Object.keys(groups).forEach((key) => {
    groups[key as keyof GroupedTasks].sort((a, b) => {
      // Priority: due date > start date
      const dateA = a.dueDate || a.startDate;
      const dateB = b.dueDate || b.startDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });
  });

  return groups;
}

// Utility function for getting task status
export function getTaskStatus(task: TaskItem, today: Dayjs = dayjs()): string {
  const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
  const startDate = task.startDate ? dayjs(task.startDate) : null;

  if (task.doneDate) return "completed";
  if (dueDate?.isBefore(today, "day")) return "overdue";
  if (dueDate?.isSame(today, "day")) return "dueToday";
  if (startDate?.isSame(today, "day")) return "startingToday";
  if (startDate?.isBefore(today) && (!dueDate || dueDate.isAfter(today))) {
    return "inProgress";
  }
  if (dueDate?.isAfter(today) && dueDate.isBefore(today.add(7, "day"))) {
    return "dueThisWeek";
  }
  if (startDate?.isAfter(today)) return "notStarted";
  return "future";
}
