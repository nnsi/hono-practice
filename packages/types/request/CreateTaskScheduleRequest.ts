import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import type { z } from "zod";
export const CreateTaskScheduleRequestSchema = taskScheduleDataSchema;
export type CreateTaskScheduleRequest = z.infer<
  typeof CreateTaskScheduleRequestSchema
>;
