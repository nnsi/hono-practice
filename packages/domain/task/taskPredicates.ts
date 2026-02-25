type TaskDateFields = {
  doneDate?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  deletedAt?: string | Date | null;
  archivedAt?: string | Date | null;
};

/** タスクが指定日に表示されるかを判定する */
export function isTaskVisibleOnDate(
  task: TaskDateFields,
  date: string,
): boolean {
  if (task.deletedAt || task.archivedAt) return false;

  // 完了済み: 完了日と一致する日だけ表示
  if (task.doneDate) {
    return task.doneDate === date;
  }

  // 未完了: 期間内 or 期間指定なし
  if (task.startDate && task.startDate > date) return false;
  if (task.dueDate && task.dueDate < date) return false;
  return true;
}

/** アクティブ（未削除・未アーカイブ）なタスクかを判定する */
export function isActiveTask(
  task: Pick<TaskDateFields, "deletedAt" | "archivedAt">,
): boolean {
  return !task.deletedAt && !task.archivedAt;
}

/** アーカイブ済み（未削除・アーカイブ済み）なタスクかを判定する */
export function isArchivedTask(
  task: Pick<TaskDateFields, "deletedAt" | "archivedAt">,
): boolean {
  return !task.deletedAt && !!task.archivedAt;
}
