import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { taskSchedules } from "@infra/drizzle/schema";
import {
  type TaskSchedule,
  type TaskScheduleId,
  TaskScheduleSchema,
} from "@packages/domain/taskSchedule";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, desc, eq, isNull } from "drizzle-orm";

export type TaskScheduleRepository = ReturnType<
  typeof newTaskScheduleRepository
>;
export function newTaskScheduleRepository(db: QueryExecutor) {
  const owned = (userId: UserId, id: TaskScheduleId) =>
    and(
      eq(taskSchedules.userId, userId),
      eq(taskSchedules.id, id),
      isNull(taskSchedules.deletedAt),
    );
  const entity = (row: typeof taskSchedules.$inferSelect) =>
    TaskScheduleSchema.parse({ ...row, type: "persisted" });
  return {
    async getTaskSchedulesByUserId(userId: UserId) {
      const rows = await db
        .select()
        .from(taskSchedules)
        .where(
          and(
            eq(taskSchedules.userId, userId),
            isNull(taskSchedules.deletedAt),
          ),
        )
        .orderBy(desc(taskSchedules.createdAt));
      return rows.map(entity);
    },
    async getTaskScheduleByIdAndUserId(userId: UserId, id: TaskScheduleId) {
      const [row] = await db
        .select()
        .from(taskSchedules)
        .where(owned(userId, id));
      return row ? entity(row) : undefined;
    },
    async createTaskSchedule(schedule: TaskSchedule) {
      const [row] = await db.insert(taskSchedules).values(schedule).returning();
      return entity(row);
    },
    async updateTaskSchedule(schedule: TaskSchedule) {
      const { id, userId, type: _type, ...data } = schedule;
      const [row] = await db
        .update(taskSchedules)
        .set({ ...data, updatedAt: new Date() })
        .where(owned(userId, id))
        .returning();
      return row ? entity(row) : undefined;
    },
    async deleteTaskSchedule(userId: UserId, id: TaskScheduleId) {
      await db
        .update(taskSchedules)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(owned(userId, id));
    },
  };
}
