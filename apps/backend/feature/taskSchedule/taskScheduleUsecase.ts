import { AppError, ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type TaskScheduleId,
  createTaskScheduleEntity,
  createTaskScheduleId,
  taskScheduleDataSchema,
} from "@packages/domain/taskSchedule";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateTaskScheduleRequest,
  UpdateTaskScheduleRequest,
} from "@packages/types/request";

import type { ActivityRepository } from "../activity/activityRepository";
import { assertTaskActivityLink } from "../task/taskActivityLink";
import type { TaskScheduleRepository } from "./taskScheduleRepository";

export type TaskScheduleUsecase = ReturnType<typeof newTaskScheduleUsecase>;
export function newTaskScheduleUsecase(
  repo: TaskScheduleRepository,
  activityRepo: ActivityRepository,
  tracer: Tracer,
) {
  async function getTaskSchedule(userId: UserId, id: TaskScheduleId) {
    const row = await tracer.span("db.getTaskScheduleByIdAndUserId", () =>
      repo.getTaskScheduleByIdAndUserId(userId, id),
    );
    if (!row) throw new ResourceNotFoundError("Task schedule not found");
    return row;
  }
  return {
    getTaskSchedules(userId: UserId) {
      return tracer.span("db.getTaskSchedulesByUserId", () =>
        repo.getTaskSchedulesByUserId(userId),
      );
    },
    async createTaskSchedule(
      userId: UserId,
      params: CreateTaskScheduleRequest,
    ) {
      await assertTaskActivityLink(
        activityRepo,
        tracer,
        userId,
        params.activityId,
        params.activityKindId,
      );
      const entity = createTaskScheduleEntity({
        ...params,
        id: createTaskScheduleId(),
        userId,
        type: "new",
      });
      return tracer.span("db.createTaskSchedule", () =>
        repo.createTaskSchedule(entity),
      );
    },
    async updateTaskSchedule(
      userId: UserId,
      id: TaskScheduleId,
      params: UpdateTaskScheduleRequest,
    ) {
      const existing = await getTaskSchedule(userId, id);
      const changes = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined),
      );
      const activityId =
        params.activityId === undefined
          ? existing.activityId
          : params.activityId;
      const activityKindId =
        params.activityKindId !== undefined
          ? params.activityKindId
          : params.activityId !== undefined
            ? null
            : existing.activityKindId;
      const recurrenceType = params.recurrenceType ?? existing.recurrenceType;
      const parsed = taskScheduleDataSchema.safeParse({
        ...existing,
        ...changes,
        activityId,
        activityKindId,
        ...(recurrenceType !== existing.recurrenceType &&
          (recurrenceType === "interval"
            ? { weekdays: null }
            : { intervalDays: null })),
      });
      if (!parsed.success) throw new AppError("Invalid task schedule", 400);
      if (
        params.activityId !== undefined ||
        params.activityKindId !== undefined
      ) {
        await assertTaskActivityLink(
          activityRepo,
          tracer,
          userId,
          activityId,
          activityKindId,
        );
      }
      const entity = createTaskScheduleEntity({ ...existing, ...parsed.data });
      const updated = await tracer.span("db.updateTaskSchedule", () =>
        repo.updateTaskSchedule(entity),
      );
      if (!updated) throw new ResourceNotFoundError("Task schedule not found");
      return updated;
    },
    async deleteTaskSchedule(userId: UserId, id: TaskScheduleId) {
      await getTaskSchedule(userId, id);
      await tracer.span("db.deleteTaskSchedule", () =>
        repo.deleteTaskSchedule(userId, id),
      );
    },
  };
}
