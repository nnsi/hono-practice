import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { taskScheduleRecurrenceSchema } from "@packages/domain/taskSchedule";

import type { TaskScheduleRecord } from "../types/taskSchedule";
import {
  type ApiRecord,
  str,
  strOrNull,
  toBool,
  toISOString,
  toIconType,
  toNum,
  toNumOrNull,
  toRecordingMode,
} from "./apiMapperHelpers";

// parseDayTargets imported from domain layer handles JSON parsing + key validation

export function mapApiActivity(a: ApiRecord): ActivityRecord {
  return {
    id: a.id,
    userId: str(a.userId ?? a.user_id),
    name: str(a.name),
    label: str(a.label),
    emoji: str(a.emoji),
    iconType: toIconType(a.iconType ?? a.icon_type),
    iconUrl: strOrNull(a.iconUrl ?? a.icon_url),
    iconThumbnailUrl: strOrNull(a.iconThumbnailUrl ?? a.icon_thumbnail_url),
    description: str(a.description),
    quantityUnit: str(a.quantityUnit ?? a.quantity_unit),
    orderIndex: str(a.orderIndex ?? a.order_index),
    showCombinedStats: toBool(
      a.showCombinedStats ?? a.show_combined_stats,
      true,
    ),
    recordingMode: toRecordingMode(a.recordingMode ?? a.recording_mode),
    recordingModeConfig: strOrNull(
      a.recordingModeConfig ?? a.recording_mode_config,
    ),
    createdAt: toISOString(a.createdAt ?? a.created_at),
    updatedAt: toISOString(a.updatedAt ?? a.updated_at),
    deletedAt: strOrNull(a.deletedAt ?? a.deleted_at),
  };
}

export function mapApiActivityKind(k: ApiRecord): ActivityKindRecord {
  return {
    id: k.id,
    activityId: str(k.activityId ?? k.activity_id),
    name: str(k.name),
    color: strOrNull(k.color),
    orderIndex: str(k.orderIndex ?? k.order_index),
    createdAt: toISOString(k.createdAt ?? k.created_at),
    updatedAt: toISOString(k.updatedAt ?? k.updated_at),
    deletedAt: strOrNull(k.deletedAt ?? k.deleted_at),
  };
}

export function mapApiActivityLog(
  l: ApiRecord,
): Omit<ActivityLogRecord, "userId"> {
  return {
    id: l.id,
    activityId: str(l.activityId ?? l.activity_id),
    activityKindId: strOrNull(l.activityKindId ?? l.activity_kind_id),
    quantity: toNumOrNull(l.quantity),
    memo: str(l.memo),
    date: str(l.date),
    time: strOrNull(l.time ?? l.done_hour),
    taskId: strOrNull(l.taskId ?? l.task_id),
    createdAt: toISOString(l.createdAt ?? l.created_at),
    updatedAt: toISOString(l.updatedAt ?? l.updated_at),
    deletedAt: strOrNull(l.deletedAt ?? l.deleted_at),
  };
}

export function mapApiGoal(g: ApiRecord): GoalRecord {
  return {
    id: g.id,
    userId: str(g.userId ?? g.user_id),
    activityId: str(g.activityId ?? g.activity_id),
    dailyTargetQuantity: toNum(
      g.dailyTargetQuantity ?? g.daily_target_quantity,
      0,
    ),
    startDate: str(g.startDate ?? g.start_date),
    endDate: strOrNull(g.endDate ?? g.end_date),
    isActive: toBool(g.isActive ?? g.is_active, true),
    description: str(g.description),
    debtCap: toNumOrNull(g.debtCap ?? g.debt_cap),
    dayTargets: parseDayTargets(g.dayTargets ?? g.day_targets),
    currentBalance: toNum(g.currentBalance ?? g.current_balance, 0),
    totalTarget: toNum(g.totalTarget ?? g.total_target, 0),
    totalActual: toNum(g.totalActual ?? g.total_actual, 0),
    createdAt: toISOString(g.createdAt ?? g.created_at),
    updatedAt: toISOString(g.updatedAt ?? g.updated_at),
    deletedAt: strOrNull(g.deletedAt ?? g.deleted_at),
  };
}

export function mapApiGoalFreezePeriod(fp: ApiRecord): GoalFreezePeriodRecord {
  return {
    id: fp.id,
    goalId: str(fp.goalId ?? fp.goal_id),
    userId: str(fp.userId ?? fp.user_id),
    startDate: str(fp.startDate ?? fp.start_date),
    endDate: strOrNull(fp.endDate ?? fp.end_date),
    createdAt: toISOString(fp.createdAt ?? fp.created_at),
    updatedAt: toISOString(fp.updatedAt ?? fp.updated_at),
    deletedAt: strOrNull(fp.deletedAt ?? fp.deleted_at),
  };
}

export function mapApiTask(t: ApiRecord): TaskRecord {
  return {
    id: t.id,
    userId: str(t.userId ?? t.user_id),
    activityId: strOrNull(t.activityId ?? t.activity_id),
    activityKindId: strOrNull(t.activityKindId ?? t.activity_kind_id),
    quantity: t.quantity != null ? Number(t.quantity) : null,
    title: str(t.title),
    startDate: strOrNull(t.startDate ?? t.start_date),
    dueDate: strOrNull(t.dueDate ?? t.due_date),
    doneDate: strOrNull(t.doneDate ?? t.done_date),
    memo: str(t.memo),
    archivedAt: strOrNull(t.archivedAt ?? t.archived_at),
    scheduleId: strOrNull(t.scheduleId ?? t.schedule_id),
    scheduledDate: strOrNull(t.scheduledDate ?? t.scheduled_date),
    createdAt: toISOString(t.createdAt ?? t.created_at),
    updatedAt: toISOString(t.updatedAt ?? t.updated_at),
    deletedAt: strOrNull(t.deletedAt ?? t.deleted_at),
  };
}

export function mapApiNote(n: ApiRecord): NoteRecord {
  return {
    id: n.id,
    userId: str(n.userId ?? n.user_id),
    activityId: strOrNull(n.activityId ?? n.activity_id),
    title: str(n.title),
    content: str(n.content),
    createdAt: toISOString(n.createdAt ?? n.created_at),
    updatedAt: toISOString(n.updatedAt ?? n.updated_at),
    deletedAt: strOrNull(n.deletedAt ?? n.deleted_at),
  };
}

export function mapApiTaskSchedule(s: ApiRecord): TaskScheduleRecord {
  const recurrence = taskScheduleRecurrenceSchema.parse({
    recurrenceType: s.recurrenceType ?? s.recurrence_type,
    intervalDays: toNumOrNull(s.intervalDays ?? s.interval_days),
    weekdays: s.weekdays ?? null,
  });
  return {
    ...recurrence,
    id: s.id,
    userId: str(s.userId ?? s.user_id),
    activityId: strOrNull(s.activityId ?? s.activity_id),
    activityKindId: strOrNull(s.activityKindId ?? s.activity_kind_id),
    quantity: toNumOrNull(s.quantity),
    title: str(s.title),
    memo: strOrNull(s.memo),
    startDate: str(s.startDate ?? s.start_date),
    endDate: strOrNull(s.endDate ?? s.end_date),
    isActive: toBool(s.isActive ?? s.is_active, true),
    createdAt: toISOString(s.createdAt ?? s.created_at),
    updatedAt: toISOString(s.updatedAt ?? s.updated_at),
    deletedAt: strOrNull(s.deletedAt ?? s.deleted_at),
  };
}
