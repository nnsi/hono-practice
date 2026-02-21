import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { activities, activityLogs } from "@infra/drizzle/schema";
import { SyncActivityLogsRequestSchema } from "@packages/types-v2";

export const activityLogV2Route = new Hono<AppContext>();

// バッチ同期（upsert）
activityLogV2Route.post("/activity-logs/sync", async (c) => {
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

  const syncedIds: string[] = [];
  const serverWins: (typeof activityLogs.$inferSelect)[] = [];
  const skippedIds: string[] = [];
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  for (const log of logs) {
    // バリデーション: activityId 所有チェック + updatedAt 未来制限
    if (
      !ownedActivityIdSet.has(log.activityId) ||
      new Date(log.updatedAt) > maxAllowed
    ) {
      skippedIds.push(log.id);
      continue;
    }

    const result = await db
      .insert(activityLogs)
      .values({
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
      })
      .onConflictDoUpdate({
        target: activityLogs.id,
        set: {
          activityId: log.activityId,
          activityKindId: log.activityKindId,
          quantity: log.quantity,
          memo: log.memo,
          date: log.date,
          time: log.time,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
          deletedAt: log.deletedAt ? new Date(log.deletedAt) : null,
        },
        setWhere: and(
          lt(activityLogs.updatedAt, new Date(log.updatedAt)),
          eq(activityLogs.userId, userId),
        ),
      })
      .returning();

    if (result.length > 0) {
      syncedIds.push(log.id);
    } else {
      // サーバーが勝った or 他ユーザーの行
      const serverLog = await db
        .select()
        .from(activityLogs)
        .where(
          and(eq(activityLogs.id, log.id), eq(activityLogs.userId, userId)),
        )
        .limit(1);
      if (serverLog.length > 0) {
        serverWins.push(serverLog[0]);
      } else {
        skippedIds.push(log.id);
      }
    }
  }

  return c.json({ syncedIds, serverWins, skippedIds });
});

// データ取得（初回同期 / 差分取得用）
activityLogV2Route.get("/activity-logs", async (c) => {
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
