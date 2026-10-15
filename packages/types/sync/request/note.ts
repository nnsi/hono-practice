import { z } from "zod";

import { hasUniqueIds } from "./uniqueIds";

export const UpsertNoteRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  content: z.string().max(100_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const SyncNotesRequestSchema = z.object({
  notes: z
    .array(UpsertNoteRequestSchema)
    .max(100)
    .refine(hasUniqueIds, "duplicate note ids"),
});

export type UpsertNoteRequest = z.infer<typeof UpsertNoteRequestSchema>;
export type SyncNotesRequest = z.infer<typeof SyncNotesRequestSchema>;
