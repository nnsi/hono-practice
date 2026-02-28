import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { tasks } from "@infra/drizzle/schema";
import { SyncTasksRequestSchema } from "@packages/types-v2";

export const taskV2Route = new Hono<AppContext>()

// GET /tasks - 全タスク取得
.get("/tasks", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const since = c.req.query("since");

  const conditions = [eq(tasks.userId, userId)];
  if (since) {
    conditions.push(gt(tasks.updatedAt, new Date(since)));
  }

  const result = await db
    .select()
    .from(tasks)
    .where(and(...conditions));

  return c.json({ tasks: result });
})

// POST /tasks/sync - バッチ同期（upsert）
.post("/tasks/sync", async (c) => {
  const body = await c.req.json();
  const parsed = SyncTasksRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request", errors: parsed.error.issues },
      400,
    );
  }

  const { tasks: taskList } = parsed.data;
  const userId = c.get("userId");
  const db = c.env.DB;

  const skippedIds: string[] = [];
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  const validTasks = taskList.filter((task) => {
    if (new Date(task.updatedAt) > maxAllowed) {
      skippedIds.push(task.id);
      return false;
    }
    return true;
  });

  if (validTasks.length === 0) {
    return c.json({ syncedIds: [], serverWins: [], skippedIds });
  }

  const upserted = await db
    .insert(tasks)
    .values(
      validTasks.map((task) => ({
        id: task.id,
        userId,
        title: task.title,
        startDate: task.startDate,
        dueDate: task.dueDate,
        doneDate: task.doneDate,
        memo: task.memo,
        archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
      })),
    )
    .onConflictDoUpdate({
      target: tasks.id,
      set: {
        title: sql`excluded.title`,
        startDate: sql`excluded.start_date`,
        dueDate: sql`excluded.due_date`,
        doneDate: sql`excluded.done_date`,
        memo: sql`excluded.memo`,
        archivedAt: sql`excluded.archived_at`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: and(
        lt(tasks.updatedAt, sql`excluded.updated_at`),
        eq(tasks.userId, userId),
      ),
    })
    .returning();

  const syncedIdSet = new Set(upserted.map((r) => r.id));
  const syncedIds = [...syncedIdSet];

  const missedIds = validTasks
    .map((t) => t.id)
    .filter((id) => !syncedIdSet.has(id));

  let serverWins: (typeof tasks.$inferSelect)[] = [];
  if (missedIds.length > 0) {
    serverWins = await db
      .select()
      .from(tasks)
      .where(
        and(inArray(tasks.id, missedIds), eq(tasks.userId, userId)),
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
