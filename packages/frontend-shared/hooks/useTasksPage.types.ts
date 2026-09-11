import type { TaskItem } from "@packages/domain/task/types";

import type { MaterializeTaskRepository } from "./materializeScheduledTask";
import type { ReactHooks } from "./types";
import type { ScheduledTaskSourceDeps } from "./useTodayScheduledTasks";

/** タスクページのタブ。schedules = 繰り返し（TaskSchedule）の一覧・管理 */
export type TasksTab = "active" | "archived" | "schedules";

export type UseTasksPageDeps = ScheduledTaskSourceDeps & {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  useActiveTasks: () => { tasks: TaskItem[] };
  useArchivedTasks: () => { tasks: TaskItem[] };
  taskRepository: MaterializeTaskRepository & {
    updateTask: (
      id: string,
      data: { doneDate: string | null } | { startDate: string },
    ) => Promise<unknown>;
    softDeleteTask: (id: string) => Promise<unknown>;
    archiveTask: (id: string) => Promise<unknown>;
  };
  activityLogRepository: {
    createActivityLog: (input: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
    softDeleteActivityLogByTaskId: (taskId: string) => Promise<void>;
  };
  syncEngine: {
    syncTasks: () => Promise<unknown>;
    syncActivityLogs: () => Promise<unknown>;
  };
  useShowCompletedState?: () => [
    boolean,
    (value: boolean | ((prev: boolean) => boolean)) => void,
  ];
};
