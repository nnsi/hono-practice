import { activityRepository } from "../db/activityRepository";
import { activityLogRepository } from "../db/activityLogRepository";
import { db } from "../db/schema";
import { apiFetch } from "../utils/apiClient";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function performInitialSync(userId: string) {
  // authState を更新
  await db.authState.put({
    id: "current",
    userId,
    lastLoginAt: new Date().toISOString(),
  });

  // activities + activityKinds を取得
  const activitiesRes = await apiFetch("/users/v2/activities");
  if (activitiesRes.ok) {
    const data = await activitiesRes.json();
    await activityRepository.upsertActivities(
      data.activities.map((a: Record<string, unknown>) => ({
        id: a.id,
        userId: a.userId ?? a.user_id,
        name: a.name ?? "",
        label: a.label ?? "",
        emoji: a.emoji ?? "",
        iconType: a.iconType ?? a.icon_type ?? "emoji",
        iconUrl: a.iconUrl ?? a.icon_url ?? null,
        iconThumbnailUrl: a.iconThumbnailUrl ?? a.icon_thumbnail_url ?? null,
        description: a.description ?? "",
        quantityUnit: a.quantityUnit ?? a.quantity_unit ?? "",
        orderIndex: a.orderIndex ?? a.order_index ?? "",
        showCombinedStats: a.showCombinedStats ?? a.show_combined_stats ?? true,
        createdAt: typeof a.createdAt === "string" ? a.createdAt : (a.created_at as string) ?? new Date().toISOString(),
        updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : (a.updated_at as string) ?? new Date().toISOString(),
        deletedAt: a.deletedAt ?? a.deleted_at ?? null,
      })),
    );
    if (data.activityKinds?.length > 0) {
      await activityRepository.upsertActivityKinds(
        data.activityKinds.map((k: Record<string, unknown>) => ({
          id: k.id,
          activityId: k.activityId ?? k.activity_id,
          name: k.name ?? "",
          color: k.color ?? null,
          orderIndex: k.orderIndex ?? k.order_index ?? "",
          createdAt: typeof k.createdAt === "string" ? k.createdAt : (k.created_at as string) ?? new Date().toISOString(),
          updatedAt: typeof k.updatedAt === "string" ? k.updatedAt : (k.updated_at as string) ?? new Date().toISOString(),
          deletedAt: k.deletedAt ?? k.deleted_at ?? null,
        })),
      );
    }
  }

  // activityLogs を取得（差分同期対応）
  const lastSyncedAt = localStorage.getItem(LAST_SYNCED_KEY);
  const logsUrl = lastSyncedAt
    ? `/users/v2/activity-logs?since=${encodeURIComponent(lastSyncedAt)}`
    : "/users/v2/activity-logs";

  const logsRes = await apiFetch(logsUrl);
  if (logsRes.ok) {
    const data = await logsRes.json();
    if (data.logs?.length > 0) {
      await activityLogRepository.upsertFromServer(
        data.logs.map((l: Record<string, unknown>) => ({
          id: l.id,
          activityId: l.activityId ?? l.activity_id,
          activityKindId: l.activityKindId ?? l.activity_kind_id ?? null,
          quantity: l.quantity ?? null,
          memo: l.memo ?? "",
          date: l.date,
          time: l.time ?? l.done_hour ?? null,
          createdAt: typeof l.createdAt === "string" ? l.createdAt : (l.created_at as string) ?? new Date().toISOString(),
          updatedAt: typeof l.updatedAt === "string" ? l.updatedAt : (l.updated_at as string) ?? new Date().toISOString(),
          deletedAt: l.deletedAt ?? l.deleted_at ?? null,
        })),
      );
    }
  }

  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}
