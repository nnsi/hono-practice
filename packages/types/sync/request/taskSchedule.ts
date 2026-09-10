import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import { z } from "zod";
export const UpsertTaskScheduleRequestSchema = taskScheduleDataSchema.and(
  z.object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  }),
);
export const SyncTaskSchedulesRequestSchema = z.object({
  taskSchedules: z
    .array(UpsertTaskScheduleRequestSchema)
    .max(100)
    .refine(
      (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      "duplicate task schedule ids",
    ),
});
export type UpsertTaskScheduleRequest = z.infer<
  typeof UpsertTaskScheduleRequestSchema
>;
export type SyncTaskSchedulesRequest = z.infer<
  typeof SyncTaskSchedulesRequestSchema
>;
