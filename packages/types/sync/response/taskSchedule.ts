import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import { z } from "zod";

const TaskScheduleRowSchema = taskScheduleDataSchema.and(
  z.object({
    id: z.string(),
    userId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
  }),
);
export const GetTaskSchedulesV2ResponseSchema = z.object({
  taskSchedules: z.array(TaskScheduleRowSchema),
});
export const SyncTaskSchedulesV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),
  serverWins: z.array(TaskScheduleRowSchema),
  skippedIds: z.array(z.string()),
});
export type GetTaskSchedulesV2Response = z.infer<
  typeof GetTaskSchedulesV2ResponseSchema
>;
export type SyncTaskSchedulesResponse = z.infer<
  typeof SyncTaskSchedulesV2ResponseSchema
>;
