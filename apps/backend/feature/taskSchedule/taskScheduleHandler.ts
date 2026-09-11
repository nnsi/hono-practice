import { AppError } from "@backend/error";
import type {
  TaskSchedule,
  TaskScheduleId,
} from "@packages/domain/taskSchedule";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateTaskScheduleRequest,
  UpdateTaskScheduleRequest,
} from "@packages/types/request";
import {
  GetTaskSchedulesResponseSchema,
  TaskScheduleResponseSchema,
} from "@packages/types/response";

import type { TaskScheduleUsecase } from "./taskScheduleUsecase";

function toResponse(schedule: TaskSchedule) {
  if (schedule.type !== "persisted")
    throw new AppError("Task schedule not persisted", 500);
  return TaskScheduleResponseSchema.parse({
    ...schedule,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  });
}
export function newTaskScheduleHandler(uc: TaskScheduleUsecase) {
  return {
    async getTaskSchedules(userId: UserId) {
      return GetTaskSchedulesResponseSchema.parse({
        taskSchedules: (await uc.getTaskSchedules(userId)).map(toResponse),
      });
    },
    async createTaskSchedule(
      userId: UserId,
      params: CreateTaskScheduleRequest,
    ) {
      return toResponse(await uc.createTaskSchedule(userId, params));
    },
    async updateTaskSchedule(
      userId: UserId,
      id: TaskScheduleId,
      params: UpdateTaskScheduleRequest,
    ) {
      return toResponse(await uc.updateTaskSchedule(userId, id, params));
    },
    async deleteTaskSchedule(userId: UserId, id: TaskScheduleId) {
      await uc.deleteTaskSchedule(userId, id);
      return { success: true };
    },
  };
}
