import type {
  DexieActivity,
  DexieActivityKind,
  DexieActivityLog,
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

function toISOString(value: string | undefined | null): string {
  return typeof value === "string" ? value : new Date().toISOString();
}

export function mapApiActivity(a: ApiActivity): Omit<DexieActivity, never> {
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
): Omit<DexieActivityKind, never> {
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
