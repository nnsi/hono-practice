import type { CreateTaskInput } from "@packages/domain/task/taskRepository";
import type { TaskItem } from "@packages/domain/task/types";
import type { VirtualScheduledTask } from "@packages/domain/taskSchedule";

export type MaterializeTaskRepository = {
  createTask: (input: CreateTaskInput) => Promise<unknown>;
  /** 削除済み・archive 済みも含めて返す（同 id 行の有無を見るため） */
  getTasksByScheduledDate: (
    date: string,
    scheduleIds?: string[],
  ) => Promise<TaskItem[]>;
};

/**
 * 仮想タスク（表示時に算出されたスケジュール由来の行）かどうかを判定する。
 * `TaskItem` には `isVirtual` が無いので `in` で絞り込む。
 */
export function isVirtualScheduledTask(
  task: TaskItem,
): task is VirtualScheduledTask {
  return "isVirtual" in task && task.isVirtual === true;
}

/**
 * 仮想タスクを未完了の実 Task 行として保存し、実 Task と同じ形の TaskItem を返す。
 * id は仮想タスクの決定的 id をそのまま使う（Web/Mobile で同時に操作しても
 * sync の LWW で 1 行に収束させるため）。
 * 同 id の行が既にローカルにあれば（sync で降ってきた等）insert せずその行を返す（冪等）。
 */
export async function materializeScheduledTask(
  repository: MaterializeTaskRepository,
  task: VirtualScheduledTask,
): Promise<TaskItem> {
  const existing = (
    await repository.getTasksByScheduledDate(task.scheduledDate, [
      task.scheduleId,
    ])
  ).find((row) => row.id === task.id);
  if (existing) return existing;

  await repository.createTask({
    id: task.id,
    scheduleId: task.scheduleId,
    scheduledDate: task.scheduledDate,
    title: task.title,
    activityId: task.activityId,
    activityKindId: task.activityKindId,
    quantity: task.quantity,
    startDate: task.startDate,
    dueDate: task.dueDate,
    memo: task.memo,
  });
  return {
    id: task.id,
    userId: task.userId,
    activityId: task.activityId,
    activityKindId: task.activityKindId,
    quantity: task.quantity,
    scheduleId: task.scheduleId,
    scheduledDate: task.scheduledDate,
    title: task.title,
    startDate: task.startDate,
    dueDate: task.dueDate,
    doneDate: null,
    memo: task.memo,
    archivedAt: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
