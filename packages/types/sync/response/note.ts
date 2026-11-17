import { z } from "zod";

import { SyncedRevisionsSchema } from "./syncedRevision";

const NoteRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const GetNotesV2ResponseSchema = z.object({
  notes: z.array(NoteRowSchema),
});

export const SyncNotesV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),
  syncedRevisions: SyncedRevisionsSchema,
  serverWins: z.array(NoteRowSchema),
  skippedIds: z.array(z.string()),
});

export type SyncNotesResponse = z.infer<typeof SyncNotesV2ResponseSchema>;
export type GetNotesV2Response = z.infer<typeof GetNotesV2ResponseSchema>;
