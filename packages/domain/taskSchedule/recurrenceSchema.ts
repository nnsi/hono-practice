import { z } from "zod";

export const weekdaysSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .refine(
    (days) => new Set(days).size === days.length,
    "weekdays must be unique",
  );
export const taskScheduleRecurrenceSchema = z.discriminatedUnion(
  "recurrenceType",
  [
    z.object({
      recurrenceType: z.literal("interval"),
      intervalDays: z.number().int().min(1),
      weekdays: z.null().default(null),
    }),
    z.object({
      recurrenceType: z.literal("weekdays"),
      intervalDays: z.null().default(null),
      weekdays: weekdaysSchema,
    }),
  ],
);
export type TaskScheduleRecurrence = z.infer<
  typeof taskScheduleRecurrenceSchema
>;

export const taskScheduleFieldsSchema = z.object({
  activityId: z.string().uuid().nullable().default(null),
  activityKindId: z.string().uuid().nullable().default(null),
  quantity: z.number().min(0).max(999999).nullable().default(null),
  // Task の title と同じ上限（packages/types/validation.ts の TASK_TITLE_MAX = 20。domain → types の逆依存を避けるため直値）
  title: z.string().min(1).max(20),
  memo: z.string().max(1000).nullable().default(""),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().default(null),
  isActive: z.boolean().default(true),
});
export function validateTaskScheduleDates(
  value: { startDate: string; endDate: string | null },
  ctx: z.RefinementCtx,
) {
  if (value.endDate !== null && value.endDate < value.startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "validation:endDateBeforeStartDate",
    });
  }
}
export const taskScheduleDataSchema = taskScheduleFieldsSchema
  .and(taskScheduleRecurrenceSchema)
  .superRefine(validateTaskScheduleDates);
