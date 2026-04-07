import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, notes } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertNoteRequest } from "@packages/types";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

type NoteRow = typeof notes.$inferSelect;

export type NoteSyncRepository = {
  getNotesByUserId: (userId: UserId, since?: string) => Promise<NoteRow[]>;
  upsertNotes: (
    userId: UserId,
    validNotes: UpsertNoteRequest[],
  ) => Promise<NoteRow[]>;
  getNotesByIds: (userId: UserId, ids: string[]) => Promise<NoteRow[]>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
};

export function newNoteSyncRepository(db: QueryExecutor): NoteSyncRepository {
  return {
    getNotesByUserId: getNotesByUserId(db),
    upsertNotes: upsertNotes(db),
    getNotesByIds: getNotesByIds(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
  };
}

function getNotesByUserId(db: QueryExecutor) {
  return async (userId: UserId, since?: string): Promise<NoteRow[]> => {
    const conditions = [eq(notes.userId, userId)];
    if (since) {
      conditions.push(gt(notes.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(notes)
      .where(and(...conditions));
  };
}

function upsertNotes(db: QueryExecutor) {
  return async (
    userId: UserId,
    validNotes: UpsertNoteRequest[],
  ): Promise<NoteRow[]> => {
    const rows = await db
      .insert(notes)
      .values(
        validNotes.map((note) => ({
          id: note.id,
          userId,
          activityId: note.activityId,
          title: note.title,
          content: note.content,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
          deletedAt: note.deletedAt ? new Date(note.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: notes.id,
        set: {
          title: sql`excluded.title`,
          content: sql`excluded.content`,
          activityId: sql`excluded.activity_id`,
          updatedAt: sql`GREATEST(excluded.updated_at, NOW())`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(notes.updatedAt, sql`excluded.updated_at`),
          eq(notes.userId, userId),
        ),
      })
      .returning();

    // Ensure updatedAt >= NOW() for pull visibility (fixes clock-behind inserts)
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(notes)
        .set({ updatedAt: sql`NOW()` })
        .where(and(inArray(notes.id, ids), lt(notes.updatedAt, sql`NOW()`)));
    }

    return rows;
  };
}

function getNotesByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<NoteRow[]> => {
    return await db
      .select()
      .from(notes)
      .where(and(inArray(notes.id, ids), eq(notes.userId, userId)));
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
