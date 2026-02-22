import { and, eq, gt, lt } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { tasks } from "@infra/drizzle/schema";
import { SyncTasksRequestSchema } from "@packages/types-v2";

export const taskV2Route = new Hono<AppContext>();

// GET /tasks - 全タスク取得
taskV2Route.get("/tasks", async (c) => {
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
});

// POST /tasks/sync - バッチ同期（upsert）
taskV2Route.post("/tasks/sync", async (c) => {
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

  const syncedIds: string[] = [];
  const serverWins: (typeof tasks.$inferSelect)[] = [];
  const skippedIds: string[] = [];
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  for (const task of taskList) {
    // バリデーション: updatedAt 未来制限
    if (new Date(task.updatedAt) > maxAllowed) {
      skippedIds.push(task.id);
      continue;
    }

    const result = await db
      .insert(tasks)
      .values({
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
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: task.title,
          startDate: task.startDate,
          dueDate: task.dueDate,
          doneDate: task.doneDate,
          memo: task.memo,
          archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
          updatedAt: new Date(task.updatedAt),
          deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        },
        setWhere: and(
          lt(tasks.updatedAt, new Date(task.updatedAt)),
          eq(tasks.userId, userId),
        ),
      })
      .returning();

    if (result.length > 0) {
      syncedIds.push(task.id);
    } else {
      // サーバーが勝った or 他ユーザーの行
      const serverTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
        .limit(1);
      if (serverTask.length > 0) {
        serverWins.push(serverTask[0]);
      } else {
        skippedIds.push(task.id);
      }
    }
  }

  return c.json({ syncedIds, serverWins, skippedIds });
});
