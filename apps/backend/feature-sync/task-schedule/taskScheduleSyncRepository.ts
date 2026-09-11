import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  activities,
  activityKinds,
  taskSchedules,
} from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskScheduleRequest } from "@packages/types";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

type TaskScheduleRow = typeof taskSchedules.$inferSelect;

export type ActivityKindWithActivityId = {
  id: string;
  activityId: string;
};

export type TaskScheduleSyncRepository = {
  getTaskSchedulesByUserId: (
    userId: UserId,
    since?: string,
  ) => Promise<TaskScheduleRow[]>;
  upsertTaskSchedules: (
    userId: UserId,
    validTaskSchedules: UpsertTaskScheduleRequest[],
  ) => Promise<TaskScheduleRow[]>;
  getTaskSchedulesByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<TaskScheduleRow[]>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  getOwnedActivityKindIdsWithActivityId: (
    userId: UserId,
    kindIds: string[],
  ) => Promise<ActivityKindWithActivityId[]>;
};

export function newTaskScheduleSyncRepository(
  db: QueryExecutor,
): TaskScheduleSyncRepository {
  return {
    getTaskSchedulesByUserId: getTaskSchedulesByUserId(db),
    upsertTaskSchedules: upsertTaskSchedules(db),
    getTaskSchedulesByIds: getTaskSchedulesByIds(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    getOwnedActivityKindIdsWithActivityId:
      getOwnedActivityKindIdsWithActivityId(db),
  };
}

function getTaskSchedulesByUserId(db: QueryExecutor) {
  return async (userId: UserId, since?: string): Promise<TaskScheduleRow[]> => {
    const conditions = [eq(taskSchedules.userId, userId)];
    if (since) {
      conditions.push(gt(taskSchedules.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(taskSchedules)
      .where(and(...conditions));
  };
}

function upsertTaskSchedules(db: QueryExecutor) {
  return async (
    userId: UserId,
    validTaskSchedules: UpsertTaskScheduleRequest[],
  ): Promise<TaskScheduleRow[]> => {
    const rows = await db
      .insert(taskSchedules)
      .values(
        validTaskSchedules.map((taskSchedule) => ({
          id: taskSchedule.id,
          userId,
          activityId: taskSchedule.activityId,
          activityKindId: taskSchedule.activityKindId,
          quantity: taskSchedule.quantity,
          title: taskSchedule.title,
          startDate: taskSchedule.startDate,
          endDate: taskSchedule.endDate,
          recurrenceType: taskSchedule.recurrenceType,
          intervalDays: taskSchedule.intervalDays,
          weekdays: taskSchedule.weekdays,
          isActive: taskSchedule.isActive,
          memo: taskSchedule.memo,
          createdAt: new Date(taskSchedule.createdAt),
          updatedAt: new Date(taskSchedule.updatedAt),
          deletedAt: taskSchedule.deletedAt
            ? new Date(taskSchedule.deletedAt)
            : null,
        })),
      )
      .onConflictDoUpdate({
        target: taskSchedules.id,
        set: {
          title: sql`excluded.title`,
          activityId: sql`excluded.activity_id`,
          activityKindId: sql`excluded.activity_kind_id`,
          quantity: sql`excluded.quantity`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          recurrenceType: sql`excluded.recurrence_type`,
          intervalDays: sql`excluded.interval_days`,
          weekdays: sql`excluded.weekdays`,
          isActive: sql`excluded.is_active`,
          memo: sql`excluded.memo`,
          updatedAt: sql`GREATEST(excluded.updated_at, NOW())`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(taskSchedules.updatedAt, sql`excluded.updated_at`),
          eq(taskSchedules.userId, userId),
        ),
      })
      .returning();

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(taskSchedules)
        .set({ updatedAt: sql`NOW()` })
        .where(
          and(
            inArray(taskSchedules.id, ids),
            lt(taskSchedules.updatedAt, sql`NOW()`),
          ),
        );
    }

    return rows;
  };
}

function getTaskSchedulesByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<TaskScheduleRow[]> => {
    return await db
      .select()
      .from(taskSchedules)
      .where(
        and(inArray(taskSchedules.id, ids), eq(taskSchedules.userId, userId)),
      );
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
