import {
  isActiveTask,
  isArchivedTask,
  isTaskVisibleOnDate,
} from "@packages/domain/task/taskPredicates";

import { useLiveQuery } from "../db/useLiveQuery";
import { taskRepository } from "../repositories/taskRepository";
import { taskScheduleRepository } from "../repositories/taskScheduleRepository";

export function useActiveTasks() {
  const tasks = useLiveQuery("tasks", async () => {
    const all = await taskRepository.getAllActiveTasks();
    return all.filter((t) => isActiveTask(t));
  });

  return { tasks: tasks ?? [] };
}

export function useArchivedTasks() {
  const tasks = useLiveQuery("tasks", async () => {
    const all = await taskRepository.getArchivedTasks();
    return all
      .filter((t) => isArchivedTask(t))
      .sort((a, b) => {
        const aAt = a.archivedAt ?? "";
        const bAt = b.archivedAt ?? "";
        return bAt.localeCompare(aAt);
      });
  });

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery("tasks", async () => {
    const all = await taskRepository.getAllActiveTasks();
    return all.filter((t) => isTaskVisibleOnDate(t, date));
  }, [date]);

  return { tasks: tasks ?? [] };
}

/** アクティブ（削除済みでなく isActive）なスケジュール。仮想タスク算出用 */
export function useActiveTaskSchedules() {
  const schedules = useLiveQuery("task_schedules", () =>
    taskScheduleRepository.getActiveTaskSchedules(),
  );

  return { schedules: schedules ?? [] };
}

/** その日の scheduledDate を持つ Task 行（削除済み・archive 済みを含む）。仮想タスクの抑止用 */
export function useTasksOnScheduledDate(date: string) {
  const tasks = useLiveQuery(
    "tasks",
    () => taskRepository.getTasksByScheduledDate(date),
    [date],
  );

  return { tasks: tasks ?? [] };
}

/** 未削除のスケジュールすべて（一時停止中を含む）。「繰り返し」タブの一覧用 */
export function useAllTaskSchedules() {
  const schedules = useLiveQuery("task_schedules", () =>
    taskScheduleRepository.getAllTaskSchedules(),
  );

  return { schedules: schedules ?? [] };
}
