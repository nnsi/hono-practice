import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { taskScheduleRecurrenceSchema } from "@packages/domain/taskSchedule";
import type { TaskScheduleRecord } from "@packages/sync-engine";

import { str, strOrNull, toSyncStatus } from "./sqlRowHelpers";

function parseWeekdays(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * SQLite の行を TaskScheduleRecord に変換する。
 * recurrence が壊れている行（不明な recurrenceType / 範囲外の weekdays 等）は throw せず `null` を返し、
 * 呼び出し側で除外する（1 行の破損で繰り返し一覧・仮想タスク算出が全滅しないようにする）。
 */
export function mapTaskScheduleRow(
  row: Record<string, unknown>,
): Syncable<TaskScheduleRecord> | null {
  const recurrence = taskScheduleRecurrenceSchema.safeParse({
    recurrenceType: str(row.recurrence_type),
    intervalDays: row.interval_days == null ? null : Number(row.interval_days),
    weekdays: parseWeekdays(row.weekdays),
  });
  if (!recurrence.success) return null;
  return {
    ...recurrence.data,
    id: str(row.id),
    userId: str(row.user_id),
    activityId: strOrNull(row.activity_id),
    activityKindId: strOrNull(row.activity_kind_id),
    quantity: row.quantity == null ? null : Number(row.quantity),
    title: str(row.title),
    memo: strOrNull(row.memo),
    startDate: str(row.start_date),
    endDate: strOrNull(row.end_date),
    isActive: row.is_active === 1,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

export const taskScheduleColumnMap: Record<string, string> = {
  activityId: "activity_id",
  activityKindId: "activity_kind_id",
  quantity: "quantity",
  title: "title",
  memo: "memo",
  startDate: "start_date",
  endDate: "end_date",
  recurrenceType: "recurrence_type",
  intervalDays: "interval_days",
  weekdays: "weekdays",
  isActive: "is_active",
  updatedAt: "updated_at",
  deletedAt: "deleted_at",
  _syncStatus: "sync_status",
};

export const taskScheduleColumns =
  "id, user_id, activity_id, activity_kind_id, quantity, title, memo, start_date, end_date, recurrence_type, interval_days, weekdays, is_active, created_at, updated_at, deleted_at, sync_status";

export function taskScheduleValues(record: Syncable<TaskScheduleRecord>) {
  return [
    record.id,
    record.userId,
    record.activityId,
    record.activityKindId,
    record.quantity,
    record.title,
    record.memo,
    record.startDate,
    record.endDate,
    record.recurrenceType,
    record.intervalDays,
    record.weekdays === null ? null : JSON.stringify(record.weekdays),
    record.isActive ? 1 : 0,
    record.createdAt,
    record.updatedAt,
    record.deletedAt,
    record._syncStatus,
  ];
}
