import { z } from "zod";

export const createTaskRequestSchema = z.object({
  title: z
    .string()
    .min(1, "validation:titleRequired")
    .max(20, "validation:max20Chars"),
  activityId: z.string().uuid().optional(),
  activityKindId: z.string().uuid().optional(),
  quantity: z.number().min(0).max(999999).optional(),
  startDate: z.string().min(1, "validation:startDateRequired").max(10),
  dueDate: z.string().max(10).optional(),
  memo: z.string().max(1000, "validation:memoMax1000").optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
