import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import { userIdSchema } from "../user/userSchema";

// NoteId
export const noteIdSchema = z.string().uuid().brand<"NoteId">();
export type NoteId = z.infer<typeof noteIdSchema>;

export function createNoteId(id?: string): NoteId {
  const parsedId = noteIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createNoteId: Invalid id");
  }
  return parsedId.data;
}

// Note Entity
const BaseNoteSchema = z.object({
  id: noteIdSchema,
  userId: userIdSchema,
  activityId: z.string().uuid().nullish(),
  title: z.string(),
  content: z.string(),
});

const NewNoteSchema = BaseNoteSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedNoteSchema = BaseNoteSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullish(),
  }),
);

export const NoteSchema = z.discriminatedUnion("type", [
  NewNoteSchema,
  PersistedNoteSchema,
]);
export type Note = z.infer<typeof NoteSchema>;
export type NoteInput = z.input<typeof NoteSchema>;

export function createNoteEntity(params: NoteInput): Note {
  const parsedEntity = NoteSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createNoteEntity: invalid params");
  }
  return parsedEntity.data;
}
