import { z } from "zod";

import { addDateRangeIssue, dateStringSchema } from "../../dateSchemas";

export const UpsertTaskRequestSchema = z
  .object({
    id: z.string().uuid(),
    activityId: z.string().uuid().nullable(),
    activityKindId: z.string().uuid().nullable(),
    quantity: z.number().nullable(),
    title: z.string().min(1).max(500),
    startDate: dateStringSchema.nullable(),
    dueDate: dateStringSchema.nullable(),
    doneDate: dateStringSchema.nullable(),
    memo: z.string().max(10_000),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  })
  .superRefine((value, ctx) => {
    addDateRangeIssue(
      ctx,
      value.startDate,
      value.dueDate,
      "dueDate",
      "validation:dueDateBeforeStartDate",
    );
  });

export const SyncTasksRequestSchema = z.object({
  tasks: z.array(UpsertTaskRequestSchema).max(100),
});

export type UpsertTaskRequest = z.infer<typeof UpsertTaskRequestSchema>;
export type SyncTasksRequest = z.infer<typeof SyncTasksRequestSchema>;
