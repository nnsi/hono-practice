import {
  taskScheduleFieldsSchema,
  weekdaysSchema,
} from "@packages/domain/taskSchedule";
import { z } from "zod";

import { addEndDateRangeIssue } from "../dateSchemas";

export const UpdateTaskScheduleRequestSchema = taskScheduleFieldsSchema
  // Partial updates must not apply creation defaults to omitted fields.
  .extend({
    activityId: taskScheduleFieldsSchema.shape.activityId.removeDefault(),
    activityKindId:
      taskScheduleFieldsSchema.shape.activityKindId.removeDefault(),
    quantity: taskScheduleFieldsSchema.shape.quantity.removeDefault(),
    memo: taskScheduleFieldsSchema.shape.memo.removeDefault(),
    endDate: taskScheduleFieldsSchema.shape.endDate.removeDefault(),
    isActive: taskScheduleFieldsSchema.shape.isActive.removeDefault(),
  })
  .partial()
  .extend({
    recurrenceType: z.enum(["interval", "weekdays"]).optional(),
    intervalDays: z.number().int().min(1).nullish(),
    weekdays: weekdaysSchema.nullish(),
  })
  .superRefine((value, ctx) =>
    addEndDateRangeIssue(ctx, value.startDate, value.endDate),
  );
export type UpdateTaskScheduleRequest = z.infer<
  typeof UpdateTaskScheduleRequestSchema
>;
