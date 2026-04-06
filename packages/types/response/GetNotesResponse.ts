import { z } from "zod";

export const GetNoteResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const GetNotesResponseSchema = z.array(GetNoteResponseSchema);

export type GetNoteResponse = z.infer<typeof GetNoteResponseSchema>;
export type GetNotesResponse = z.infer<typeof GetNotesResponseSchema>;
