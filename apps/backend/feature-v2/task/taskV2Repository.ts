import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types-v2";
import { tasks } from "@infra/drizzle/schema";

type TaskRow = typeof tasks.$inferSelect;

export type TaskV2Repository = {
  getTasksByUserId: (
    userId: UserId,
    since?: string,
  ) => Promise<TaskRow[]>;
  upsertTasks: (
    userId: UserId,
    validTasks: UpsertTaskRequest[],
  ) => Promise<TaskRow[]>;
  getTasksByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<TaskRow[]>;
};

export function newTaskV2Repository(db: QueryExecutor): TaskV2Repository {
  return {
    getTasksByUserId: getTasksByUserId(db),
    upsertTasks: upsertTasks(db),
    getTasksByIds: getTasksByIds(db),
  };
}

function getTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId, since?: string): Promise<TaskRow[]> => {
    const conditions = [eq(tasks.userId, userId)];
    if (since) {
      conditions.push(gt(tasks.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...conditions));
  };
}

function upsertTasks(db: QueryExecutor) {
  return async (
    userId: UserId,
    validTasks: UpsertTaskRequest[],
  ): Promise<TaskRow[]> => {
    return await db
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
  };
}

function getTasksByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<TaskRow[]> => {
    return await db
      .select()
      .from(tasks)
      .where(and(inArray(tasks.id, ids), eq(tasks.userId, userId)));
  };
}
