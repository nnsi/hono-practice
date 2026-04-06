import { z } from "zod";

export const createNoteRequestSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100_000).optional().default(""),
  activityId: z.string().uuid().optional(),
});

export type CreateNoteRequest = z.infer<typeof createNoteRequestSchema>;
