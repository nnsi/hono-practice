import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import {
  activities,
  activityGoals,
  activityLogs,
} from "@infra/drizzle/schema";
import { SyncGoalsRequestSchema } from "@packages/types-v2";

export const goalV2Route = new Hono<AppContext>()

// GET /goals - 全ゴール取得（計算済みステータス付き）
.get("/goals", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const since = c.req.query("since");

  const conditions = [eq(activityGoals.userId, userId)];
  if (since) {
    conditions.push(gt(activityGoals.updatedAt, new Date(since)));
  }

  const goals = await db
    .select()
    .from(activityGoals)
    .where(and(...conditions));

  // アクティブなゴールごとにステータスを計算
  const goalsWithStats = await Promise.all(
    goals.map(async (goal) => {
      if (goal.deletedAt) {
        return { ...goal, currentBalance: 0, totalTarget: 0, totalActual: 0 };
      }

      const today = new Date().toISOString().split("T")[0];
      const endDate = goal.endDate ?? today;
      const effectiveEnd = endDate < today ? endDate : today;

      // startDate から effectiveEnd までの日数を計算
      const start = new Date(goal.startDate);
      const end = new Date(effectiveEnd);
      const days = Math.max(
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1,
        0,
      );

      const totalTarget = days * Number(goal.dailyTargetQuantity);

      // activity_logs から実績を合計
      const logsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${activityLogs.quantity}), 0)`,
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, userId),
            eq(activityLogs.activityId, goal.activityId),
            sql`${activityLogs.date} >= ${goal.startDate}`,
            sql`${activityLogs.date} <= ${effectiveEnd}`,
            isNull(activityLogs.deletedAt),
          ),
        );

      const totalActual = Number(logsResult[0]?.total ?? 0);
      const currentBalance = totalActual - totalTarget;

      return { ...goal, currentBalance, totalTarget, totalActual };
    }),
  );

  return c.json({ goals: goalsWithStats });
})

// POST /goals/sync - バッチ同期（upsert）
.post("/goals/sync", async (c) => {
  const body = await c.req.json();
  const parsed = SyncGoalsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request", errors: parsed.error.issues },
      400,
    );
  }

  const { goals } = parsed.data;
  const userId = c.get("userId");
  const db = c.env.DB;

  // activityId 所有者チェック（一括）
  const activityIds = [...new Set(goals.map((g) => g.activityId))];
  const ownedActivities =
    activityIds.length > 0
      ? await db
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              inArray(activities.id, activityIds),
              eq(activities.userId, userId),
            ),
          )
      : [];
  const ownedActivityIdSet = new Set(ownedActivities.map((a) => a.id));

  const skippedIds: string[] = [];
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  const validGoals = goals.filter((goal) => {
    if (
      !ownedActivityIdSet.has(goal.activityId) ||
      new Date(goal.updatedAt) > maxAllowed
    ) {
      skippedIds.push(goal.id);
      return false;
    }
    return true;
  });

  if (validGoals.length === 0) {
    return c.json({ syncedIds: [], serverWins: [], skippedIds });
  }

  const upserted = await db
    .insert(activityGoals)
    .values(
      validGoals.map((goal) => ({
        id: goal.id,
        userId,
        activityId: goal.activityId,
        dailyTargetQuantity: goal.dailyTargetQuantity,
        startDate: goal.startDate,
        endDate: goal.endDate,
        isActive: goal.isActive,
        description: goal.description,
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt),
        deletedAt: goal.deletedAt ? new Date(goal.deletedAt) : null,
      })),
    )
    .onConflictDoUpdate({
      target: activityGoals.id,
      set: {
        activityId: sql`excluded.activity_id`,
        dailyTargetQuantity: sql`excluded.daily_target_quantity`,
        startDate: sql`excluded.start_date`,
        endDate: sql`excluded.end_date`,
        isActive: sql`excluded.is_active`,
        description: sql`excluded.description`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: and(
        lt(activityGoals.updatedAt, sql`excluded.updated_at`),
        eq(activityGoals.userId, userId),
      ),
    })
    .returning();

  const syncedIdSet = new Set(upserted.map((r) => r.id));
  const syncedIds = [...syncedIdSet];

  const missedIds = validGoals
    .map((g) => g.id)
    .filter((id) => !syncedIdSet.has(id));

  let serverWins: (typeof activityGoals.$inferSelect)[] = [];
  if (missedIds.length > 0) {
    serverWins = await db
      .select()
      .from(activityGoals)
      .where(
        and(
          inArray(activityGoals.id, missedIds),
          eq(activityGoals.userId, userId),
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
});
