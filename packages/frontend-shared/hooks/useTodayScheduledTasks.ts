import type { TaskItem } from "@packages/domain/task/types";
import {
  type TaskScheduleRecord,
  type VirtualScheduledTask,
  resolveTodayScheduledTasks,
} from "@packages/domain/taskSchedule";

import type { ReactHooks } from "./types";

export type ScheduledTaskSourceDeps = {
  /** アクティブ（削除済みでなく isActive）なスケジュール。useLiveQuery で購読する */
  useActiveTaskSchedules: () => { schedules: TaskScheduleRecord[] };
  /** その日の scheduledDate を持つ Task 行。削除済み・archive 済みを含む（仮想タスクの抑止用） */
  useTasksOnScheduledDate: (date: string) => {
    tasks: Pick<TaskItem, "scheduleId" | "scheduledDate">[];
  };
};

type UseTodayScheduledTasksDeps = ScheduledTaskSourceDeps & {
  react: Pick<ReactHooks, "useMemo">;
};

const EMPTY: VirtualScheduledTask[] = [];

/**
 * `date` に該当するスケジュールを仮想タスクとして算出する hook を作る。
 * `enabled` が false のとき（デイリーで今日以外を見ているとき等）は空配列を返す。
 * hooks の呼び出し順を固定するため、enabled に関わらず購読 hook は常に呼ぶ。
 */
export function createUseTodayScheduledTasks(deps: UseTodayScheduledTasksDeps) {
  const {
    react: { useMemo },
    useActiveTaskSchedules,
    useTasksOnScheduledDate,
  } = deps;

  return function useTodayScheduledTasks(
    date: string,
    enabled = true,
  ): VirtualScheduledTask[] {
    const { schedules } = useActiveTaskSchedules();
    const { tasks: tasksOnDate } = useTasksOnScheduledDate(date);

    return useMemo(
      () =>
        enabled
          ? resolveTodayScheduledTasks({ schedules, tasksOnDate, today: date })
          : EMPTY,
      [schedules, tasksOnDate, date, enabled],
    );
  };
}
