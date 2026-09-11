import {
  isActiveTask,
  isArchivedTask,
  isTaskVisibleOnDate,
} from "@packages/domain/task/taskPredicates";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/schema";
import { taskRepository } from "../db/taskRepository";
import { taskScheduleRepository } from "../db/taskScheduleRepository";

export function useActiveTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks.filter((t) => isActiveTask(t)).toArray(),
  );

  return { tasks: tasks ?? [] };
}

export function useArchivedTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks
      .filter((t) => isArchivedTask(t))
      .sortBy("archivedAt")
      .then((arr) => arr.reverse()),
  );

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery(
    () => db.tasks.filter((t) => isTaskVisibleOnDate(t, date)).toArray(),
    [date],
  );

  return { tasks: tasks ?? [] };
}

/** アクティブ（削除済みでなく isActive）なスケジュール。仮想タスク算出用 */
export function useActiveTaskSchedules() {
  const schedules = useLiveQuery(() =>
    taskScheduleRepository.getActiveTaskSchedules(),
  );

  return { schedules: schedules ?? [] };
}

/** その日の scheduledDate を持つ Task 行（削除済み・archive 済みを含む）。仮想タスクの抑止用 */
export function useTasksOnScheduledDate(date: string) {
  const tasks = useLiveQuery(
    () => taskRepository.getTasksByScheduledDate(date),
    [date],
  );

  return { tasks: tasks ?? [] };
}

/** 未削除のスケジュールすべて（一時停止中を含む）。「繰り返し」タブの一覧用 */
export function useAllTaskSchedules() {
  const schedules = useLiveQuery(() =>
    taskScheduleRepository.getAllTaskSchedules(),
  );

  return { schedules: schedules ?? [] };
}
