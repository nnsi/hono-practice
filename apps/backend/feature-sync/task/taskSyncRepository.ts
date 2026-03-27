import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds, tasks } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

type TaskRow = typeof tasks.$inferSelect;

export type ActivityKindWithActivityId = {
  id: string;
  activityId: string;
};

export type TaskSyncRepository = {
  getTasksByUserId: (userId: UserId, since?: string) => Promise<TaskRow[]>;
  upsertTasks: (
    userId: UserId,
    validTasks: UpsertTaskRequest[],
  ) => Promise<TaskRow[]>;
  getTasksByIds: (userId: UserId, ids: string[]) => Promise<TaskRow[]>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  getOwnedActivityKindIdsWithActivityId: (
    userId: UserId,
    kindIds: string[],
  ) => Promise<ActivityKindWithActivityId[]>;
};

export function newTaskSyncRepository(db: QueryExecutor): TaskSyncRepository {
  return {
    getTasksByUserId: getTasksByUserId(db),
    upsertTasks: upsertTasks(db),
    getTasksByIds: getTasksByIds(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    getOwnedActivityKindIdsWithActivityId:
      getOwnedActivityKindIdsWithActivityId(db),
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
          activityId: task.activityId,
          activityKindId: task.activityKindId,
          quantity: task.quantity,
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
          activityId: sql`excluded.activity_id`,
          activityKindId: sql`excluded.activity_kind_id`,
          quantity: sql`excluded.quantity`,
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

function getOwnedActivityIds(db: QueryExecutor) {
  return async (userId: UserId, activityIds: string[]): Promise<string[]> => {
    if (activityIds.length === 0) return [];

    const rows = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(inArray(activities.id, activityIds), eq(activities.userId, userId)),
      );

    return rows.map((a) => a.id);
  };
}

function getOwnedActivityKindIdsWithActivityId(db: QueryExecutor) {
  return async (
    userId: UserId,
    kindIds: string[],
  ): Promise<ActivityKindWithActivityId[]> => {
    if (kindIds.length === 0) return [];

    return await db
      .select({ id: activityKinds.id, activityId: activityKinds.activityId })
      .from(activityKinds)
      .innerJoin(activities, eq(activityKinds.activityId, activities.id))
      .where(
        and(inArray(activityKinds.id, kindIds), eq(activities.userId, userId)),
      );
  };
}
