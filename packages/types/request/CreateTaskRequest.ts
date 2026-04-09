import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const createTaskRequestSchema = z.object({
  title: z
    .string()
    .min(1, "validation:titleRequired")
    .max(V.TASK_TITLE_MAX, "validation:max20Chars"),
  activityId: z.string().uuid().optional(),
  activityKindId: z.string().uuid().optional(),
  quantity: z.number().min(V.QUANTITY_MIN).max(V.QUANTITY_MAX).optional(),
  startDate: z.string().min(1, "validation:startDateRequired").max(V.DATE_MAX),
  dueDate: z.string().max(V.DATE_MAX).optional(),
  memo: z.string().max(V.MEMO_MAX, "validation:memoMax1000").optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
