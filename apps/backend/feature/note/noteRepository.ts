import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, notes } from "@infra/drizzle/schema";
import { DomainValidateError } from "@packages/domain/errors";
import {
  type Note,
  type NoteId,
  NoteSchema,
  createNoteEntity,
} from "@packages/domain/note/noteSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export type NoteRepository<T = QueryExecutor> = {
  getNotesByUserId: (userId: UserId, activityId?: string) => Promise<Note[]>;
  getNoteByUserIdAndNoteId: (
    userId: UserId,
    noteId: NoteId,
  ) => Promise<Note | undefined>;
  createNote: (note: Note) => Promise<Note>;
  updateNote: (note: Note) => Promise<Note | undefined>;
  deleteNote: (note: Note) => Promise<void>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  withTx: (tx: T) => NoteRepository<T>;
};

export function newNoteRepository(
  db: QueryExecutor,
): NoteRepository<QueryExecutor> {
  return {
    getNotesByUserId: getNotesByUserId(db),
    getNoteByUserIdAndNoteId: getNoteByUserIdAndNoteId(db),
    createNote: createNote(db),
    updateNote: updateNote(db),
    deleteNote: deleteNote(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    withTx: (tx) => newNoteRepository(tx),
  };
}

function getNotesByUserId(db: QueryExecutor) {
  return async (userId: UserId, activityId?: string) => {
    const conditions = [eq(notes.userId, userId), isNull(notes.deletedAt)];
    if (activityId) {
      conditions.push(eq(notes.activityId, activityId));
    }
    const result = await db.query.notes.findMany({
      where: and(...conditions),
      orderBy: desc(notes.createdAt),
    });
    return result.map((r) => createNoteEntity({ ...r, type: "persisted" }));
  };
}

function getNoteByUserIdAndNoteId(db: QueryExecutor) {
  return async (userId: UserId, noteId: NoteId) => {
    const result = await db.query.notes.findFirst({
      where: and(
        eq(notes.id, noteId),
        eq(notes.userId, userId),
        isNull(notes.deletedAt),
      ),
    });

    if (!result) {
      return undefined;
    }

    const note = createNoteEntity({ ...result, type: "persisted" });

    return note;
  };
}

function createNote(db: QueryExecutor) {
  return async (note: Note) => {
    const [result] = await db.insert(notes).values(note).returning();

    const persistedNote = NoteSchema.safeParse({
      ...result,
      type: "persisted",
    });
    if (!persistedNote.success) {
      throw new DomainValidateError("createNote: failed to parse note");
    }

    return persistedNote.data;
  };
}

function updateNote(db: QueryExecutor) {
  return async (note: Note) => {
    const [result] = await db
      .update(notes)
      .set({
        title: note.title,
        content: note.content,
        activityId: note.activityId ?? null,
      })
      .where(and(eq(notes.id, note.id), eq(notes.userId, note.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    const updatedNote = createNoteEntity({ ...result, type: "persisted" });

    return updatedNote;
  };
}

function deleteNote(db: QueryExecutor) {
  return async (note: Note) => {
    const [result] = await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, note.id), eq(notes.userId, note.userId)))
      .returning();

    if (!result) {
      throw new ResourceNotFoundError("note not found");
    }
  };
}

function getOwnedActivityIds(db: QueryExecutor) {
  return async (userId: UserId, activityIds: string[]): Promise<string[]> => {
    if (activityIds.length === 0) return [];

    const rows = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(inArray(activities.id, activityIds), eq(activities.userId, userId)),
      );

    return rows.map((a) => a.id);
  };
}
