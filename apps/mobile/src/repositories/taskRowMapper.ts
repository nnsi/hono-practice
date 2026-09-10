import type { SyncStatus } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";

import { str, strOrNull, toSyncStatus } from "./sqlRowHelpers";

type SqlRow = Record<string, unknown>;

type TaskWithSync = TaskRecord & { _syncStatus: SyncStatus };

export function mapTaskRow(row: SqlRow): TaskWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: strOrNull(row.activity_id),
    activityKindId: strOrNull(row.activity_kind_id),
    quantity: row.quantity != null ? Number(row.quantity) : null,
    scheduleId: strOrNull(row.schedule_id),
    scheduledDate: strOrNull(row.scheduled_date),
    title: str(row.title),
    startDate: strOrNull(row.start_date),
    dueDate: strOrNull(row.due_date),
    doneDate: strOrNull(row.done_date),
    memo: str(row.memo),
    archivedAt: strOrNull(row.archived_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Column map (camelCase → snake_case) ---

export const taskColumnMap: Record<string, string> = {
  title: "title",
  activityId: "activity_id",
  activityKindId: "activity_kind_id",
  quantity: "quantity",
  scheduleId: "schedule_id",
  scheduledDate: "scheduled_date",
  startDate: "start_date",
  dueDate: "due_date",
  doneDate: "done_date",
  memo: "memo",
  archivedAt: "archived_at",
  deletedAt: "deleted_at",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
};
