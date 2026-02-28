import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { activities, activityLogs } from "@infra/drizzle/schema";
import { SyncActivityLogsRequestSchema } from "@packages/types-v2";

export const activityLogV2Route = new Hono<AppContext>()

// バッチ同期（upsert）
.post("/activity-logs/sync", async (c) => {
  const body = await c.req.json();
  const parsed = SyncActivityLogsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Invalid request", errors: parsed.error.issues }, 400);
  }
  const { logs } = parsed.data;
  const userId = c.get("userId");
  const db = c.env.DB;

  // activityId 所有者チェック（一括）
  const requestedActivityIds = [...new Set(logs.map((l) => l.activityId))];
  const ownedActivities =
    requestedActivityIds.length > 0
      ? await db
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              inArray(activities.id, requestedActivityIds),
              eq(activities.userId, userId),
            ),
          )
      : [];
  const ownedActivityIdSet = new Set(ownedActivities.map((a) => a.id));

  const skippedIds: string[] = [];
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  // バリデーション: 所有チェック + updatedAt 未来制限
  const validLogs = logs.filter((log) => {
    if (
      !ownedActivityIdSet.has(log.activityId) ||
      new Date(log.updatedAt) > maxAllowed
    ) {
      skippedIds.push(log.id);
      return false;
    }
    return true;
  });

  if (validLogs.length === 0) {
    return c.json({ syncedIds: [], serverWins: [], skippedIds });
  }

  // 一括 upsert（updatedAt が新しい場合のみ更新）
  const upserted = await db
    .insert(activityLogs)
    .values(
      validLogs.map((log) => ({
        id: log.id,
        userId,
        activityId: log.activityId,
        activityKindId: log.activityKindId,
        quantity: log.quantity,
        memo: log.memo,
        date: log.date,
        time: log.time,
        createdAt: new Date(log.createdAt),
        updatedAt: new Date(log.updatedAt),
        deletedAt: log.deletedAt ? new Date(log.deletedAt) : null,
      })),
    )
    .onConflictDoUpdate({
      target: activityLogs.id,
      set: {
        activityId: sql`excluded.activity_id`,
        activityKindId: sql`excluded.activity_kind_id`,
        quantity: sql`excluded.quantity`,
        memo: sql`excluded.memo`,
        date: sql`excluded.date`,
        time: sql`excluded.done_hour`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: and(
        lt(activityLogs.updatedAt, sql`excluded.updated_at`),
        eq(activityLogs.userId, userId),
      ),
    })
    .returning();

  const syncedIdSet = new Set(upserted.map((r) => r.id));
  const syncedIds = [...syncedIdSet];

  // serverWins: upsert で返ってこなかったID（サーバー側が新しい or 別ユーザー）
  const missedIds = validLogs
    .map((l) => l.id)
    .filter((id) => !syncedIdSet.has(id));

  let serverWins: (typeof activityLogs.$inferSelect)[] = [];
  if (missedIds.length > 0) {
    serverWins = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          inArray(activityLogs.id, missedIds),
          eq(activityLogs.userId, userId),
        ),
      );
    const serverWinIdSet = new Set(serverWins.map((s) => s.id));
    for (const id of missedIds) {
      if (!serverWinIdSet.has(id)) {
        skippedIds.push(id);
      }
    }
  }

  return c.json({ syncedIds, serverWins, skippedIds });
})

// データ取得（初回同期 / 差分取得用）
.get("/activity-logs", async (c) => {
  const userId = c.get("userId");
  const since = c.req.query("since");
  const db = c.env.DB;

  const conditions = [eq(activityLogs.userId, userId)];
  if (since) {
    conditions.push(gt(activityLogs.updatedAt, new Date(since)));
  }

  const logs = await db
    .select()
    .from(activityLogs)
    .where(and(...conditions));

  return c.json({ logs });
});
