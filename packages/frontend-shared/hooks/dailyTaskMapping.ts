import type { VirtualScheduledTask } from "@packages/domain/taskSchedule";

import type { DailyTask } from "./types";

/** 実 Task 行と今日の仮想タスクを、デイリー表示用の `DailyTask[]` に正規化してマージする */
export function toDailyTasks<TRawTask extends DailyTask>(
  rawTasks: readonly TRawTask[] | undefined,
  virtualTasks: readonly VirtualScheduledTask[],
): DailyTask[] {
  return [
    ...(rawTasks ?? []).map((t) => ({
      id: t.id,
      activityId: t.activityId,
      activityKindId: t.activityKindId ?? null,
      quantity: t.quantity ?? null,
      title: t.title,
      doneDate: t.doneDate,
      memo: t.memo,
      startDate: t.startDate,
      dueDate: t.dueDate,
      scheduleId: t.scheduleId ?? null,
      _syncStatus: t._syncStatus,
    })),
    ...virtualTasks.map((t) => ({
      id: t.id,
      activityId: t.activityId,
      activityKindId: t.activityKindId,
      quantity: t.quantity,
      title: t.title,
      doneDate: t.doneDate,
      memo: t.memo,
      startDate: t.startDate,
      dueDate: t.dueDate,
      scheduleId: t.scheduleId,
      isVirtual: true,
    })),
  ];
}
