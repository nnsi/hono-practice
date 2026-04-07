import { z } from "zod";

export const updateNoteRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(100_000).optional(),
  activityId: z.string().uuid().nullable().optional(),
});

export type UpdateNoteRequest = z.infer<typeof updateNoteRequestSchema>;
