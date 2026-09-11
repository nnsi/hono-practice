import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import { z } from "zod";
export const TaskScheduleResponseSchema = taskScheduleDataSchema.and(
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);
export const GetTaskSchedulesResponseSchema = z.object({
  taskSchedules: z.array(TaskScheduleResponseSchema),
});
export type TaskScheduleResponse = z.infer<typeof TaskScheduleResponseSchema>;
export type GetTaskSchedulesResponse = z.infer<
  typeof GetTaskSchedulesResponseSchema
>;
