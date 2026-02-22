import type {
  DexieActivity,
  DexieActivityKind,
  DexieActivityLog,
  DexieGoal,
  DexieTask,
} from "../db/schema";

// API responses may use snake_case or camelCase
type ApiActivity = {
  id: string;
  userId?: string;
  user_id?: string;
  name?: string;
  label?: string;
  emoji?: string;
  iconType?: string;
  icon_type?: string;
  iconUrl?: string | null;
  icon_url?: string | null;
  iconThumbnailUrl?: string | null;
  icon_thumbnail_url?: string | null;
  description?: string;
  quantityUnit?: string;
  quantity_unit?: string;
  orderIndex?: string;
  order_index?: string;
  showCombinedStats?: boolean;
  show_combined_stats?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

type ApiActivityKind = {
  id: string;
  activityId?: string;
  activity_id?: string;
  name?: string;
  color?: string | null;
  orderIndex?: string;
  order_index?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

type ApiActivityLog = {
  id: string;
  activityId?: string;
  activity_id?: string;
  activityKindId?: string | null;
  activity_kind_id?: string | null;
  quantity?: number | null;
  memo?: string;
  date?: string;
  time?: string | null;
  done_hour?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

type ApiGoal = {
  id: string;
  userId?: string;
  user_id?: string;
  activityId?: string;
  activity_id?: string;
  dailyTargetQuantity?: number;
  daily_target_quantity?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string | null;
  end_date?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  description?: string;
  currentBalance?: number;
  current_balance?: number;
  totalTarget?: number;
  total_target?: number;
  totalActual?: number;
  total_actual?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

type ApiTask = {
  id: string;
  userId?: string;
  user_id?: string;
  title?: string;
  startDate?: string | null;
  start_date?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
  doneDate?: string | null;
  done_date?: string | null;
  memo?: string | null;
  archivedAt?: string | null;
  archived_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

function toISOString(value: string | undefined | null): string {
  return typeof value === "string" ? value : new Date().toISOString();
}

export function mapApiActivity(
  a: ApiActivity,
): Omit<DexieActivity, "_syncStatus"> {
  return {
    id: a.id,
    userId: a.userId ?? a.user_id ?? "",
    name: a.name ?? "",
    label: a.label ?? "",
    emoji: a.emoji ?? "",
    iconType:
      (a.iconType ?? a.icon_type ?? "emoji") as DexieActivity["iconType"],
    iconUrl: a.iconUrl ?? a.icon_url ?? null,
    iconThumbnailUrl: a.iconThumbnailUrl ?? a.icon_thumbnail_url ?? null,
    description: a.description ?? "",
    quantityUnit: a.quantityUnit ?? a.quantity_unit ?? "",
    orderIndex: a.orderIndex ?? a.order_index ?? "",
    showCombinedStats: a.showCombinedStats ?? a.show_combined_stats ?? true,
    createdAt: toISOString(a.createdAt ?? a.created_at),
    updatedAt: toISOString(a.updatedAt ?? a.updated_at),
    deletedAt: a.deletedAt ?? a.deleted_at ?? null,
  };
}

export function mapApiActivityKind(
  k: ApiActivityKind,
): Omit<DexieActivityKind, "_syncStatus"> {
  return {
    id: k.id,
    activityId: k.activityId ?? k.activity_id ?? "",
    name: k.name ?? "",
    color: k.color ?? null,
    orderIndex: k.orderIndex ?? k.order_index ?? "",
    createdAt: toISOString(k.createdAt ?? k.created_at),
    updatedAt: toISOString(k.updatedAt ?? k.updated_at),
    deletedAt: k.deletedAt ?? k.deleted_at ?? null,
  };
}

export function mapApiActivityLog(
  l: ApiActivityLog,
): Omit<DexieActivityLog, "_syncStatus"> {
  return {
    id: l.id,
    activityId: l.activityId ?? l.activity_id ?? "",
    activityKindId: l.activityKindId ?? l.activity_kind_id ?? null,
    quantity: l.quantity ?? null,
    memo: l.memo ?? "",
    date: l.date ?? "",
    time: l.time ?? l.done_hour ?? null,
    createdAt: toISOString(l.createdAt ?? l.created_at),
    updatedAt: toISOString(l.updatedAt ?? l.updated_at),
    deletedAt: l.deletedAt ?? l.deleted_at ?? null,
  };
}

export function mapApiGoal(
  g: ApiGoal,
): Omit<DexieGoal, "_syncStatus"> {
  return {
    id: g.id,
    userId: g.userId ?? g.user_id ?? "",
    activityId: g.activityId ?? g.activity_id ?? "",
    dailyTargetQuantity: Number(
      g.dailyTargetQuantity ?? g.daily_target_quantity ?? 0,
    ),
    startDate: g.startDate ?? g.start_date ?? "",
    endDate: g.endDate ?? g.end_date ?? null,
    isActive: g.isActive ?? g.is_active ?? true,
    description: g.description ?? "",
    currentBalance: Number(g.currentBalance ?? g.current_balance ?? 0),
    totalTarget: Number(g.totalTarget ?? g.total_target ?? 0),
    totalActual: Number(g.totalActual ?? g.total_actual ?? 0),
    createdAt: toISOString(g.createdAt ?? g.created_at),
    updatedAt: toISOString(g.updatedAt ?? g.updated_at),
    deletedAt: g.deletedAt ?? g.deleted_at ?? null,
  };
}

export function mapApiTask(
  t: ApiTask,
): Omit<DexieTask, "_syncStatus"> {
  return {
    id: t.id,
    userId: t.userId ?? t.user_id ?? "",
    title: t.title ?? "",
    startDate: t.startDate ?? t.start_date ?? null,
    dueDate: t.dueDate ?? t.due_date ?? null,
    doneDate: t.doneDate ?? t.done_date ?? null,
    memo: t.memo ?? "",
    archivedAt: t.archivedAt ?? t.archived_at ?? null,
    createdAt: toISOString(t.createdAt ?? t.created_at),
    updatedAt: toISOString(t.updatedAt ?? t.updated_at),
    deletedAt: t.deletedAt ?? t.deleted_at ?? null,
  };
}
