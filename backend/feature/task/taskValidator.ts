import { z } from "zod";

export const TaskCreateSchema = z.object({
  title: z.string(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  done: z.boolean().optional(),
});

export type TaskCreateParams = z.infer<typeof TaskCreateSchema>;

export type TaskUpdateParams = z.infer<typeof TaskUpdateSchema>;
