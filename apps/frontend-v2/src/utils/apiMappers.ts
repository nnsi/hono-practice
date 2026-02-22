import type {
  DexieActivity,
  DexieActivityKind,
  DexieActivityLog,
  DexieGoal,
  DexieTask,
} from "../db/schema";

// Loose record type for API responses — mappers use `??` to handle both null and undefined
type ApiRecord = Record<string, unknown> & { id: string };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toISOString(v: unknown): string {
  return typeof v === "string" ? v : new Date().toISOString();
}

const VALID_ICON_TYPES = new Set(["emoji", "upload", "generate"]);

function toIconType(value: unknown): "emoji" | "upload" | "generate" {
  if (typeof value === "string" && VALID_ICON_TYPES.has(value)) {
    return value as "emoji" | "upload" | "generate";
  }
  return "emoji";
}

export function mapApiActivity(
  a: ApiRecord,
): Omit<DexieActivity, "_syncStatus"> {
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
    showCombinedStats: (a.showCombinedStats ?? a.show_combined_stats ?? true) as boolean,
    createdAt: toISOString(a.createdAt ?? a.created_at),
    updatedAt: toISOString(a.updatedAt ?? a.updated_at),
    deletedAt: strOrNull(a.deletedAt ?? a.deleted_at),
  };
}

export function mapApiActivityKind(
  k: ApiRecord,
): Omit<DexieActivityKind, "_syncStatus"> {
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
): Omit<DexieActivityLog, "_syncStatus"> {
  return {
    id: l.id,
    activityId: str(l.activityId ?? l.activity_id),
    activityKindId: strOrNull(l.activityKindId ?? l.activity_kind_id),
    quantity: (l.quantity ?? null) as number | null,
    memo: str(l.memo),
    date: str(l.date),
    time: strOrNull(l.time ?? l.done_hour),
    createdAt: toISOString(l.createdAt ?? l.created_at),
    updatedAt: toISOString(l.updatedAt ?? l.updated_at),
    deletedAt: strOrNull(l.deletedAt ?? l.deleted_at),
  };
}

export function mapApiGoal(
  g: ApiRecord,
): Omit<DexieGoal, "_syncStatus"> {
  return {
    id: g.id,
    userId: str(g.userId ?? g.user_id),
    activityId: str(g.activityId ?? g.activity_id),
    dailyTargetQuantity: Number(g.dailyTargetQuantity ?? g.daily_target_quantity ?? 0),
    startDate: str(g.startDate ?? g.start_date),
    endDate: strOrNull(g.endDate ?? g.end_date),
    isActive: (g.isActive ?? g.is_active ?? true) as boolean,
    description: str(g.description),
    currentBalance: Number(g.currentBalance ?? g.current_balance ?? 0),
    totalTarget: Number(g.totalTarget ?? g.total_target ?? 0),
    totalActual: Number(g.totalActual ?? g.total_actual ?? 0),
    createdAt: toISOString(g.createdAt ?? g.created_at),
    updatedAt: toISOString(g.updatedAt ?? g.updated_at),
    deletedAt: strOrNull(g.deletedAt ?? g.deleted_at),
  };
}

export function mapApiTask(
  t: ApiRecord,
): Omit<DexieTask, "_syncStatus"> {
  return {
    id: t.id,
    userId: str(t.userId ?? t.user_id),
    title: str(t.title),
    startDate: strOrNull(t.startDate ?? t.start_date),
    dueDate: strOrNull(t.dueDate ?? t.due_date),
    doneDate: strOrNull(t.doneDate ?? t.done_date),
    memo: str(t.memo),
    archivedAt: strOrNull(t.archivedAt ?? t.archived_at),
    createdAt: toISOString(t.createdAt ?? t.created_at),
    updatedAt: toISOString(t.updatedAt ?? t.updated_at),
    deletedAt: strOrNull(t.deletedAt ?? t.deleted_at),
  };
}
