import type { notes } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertNoteRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { NoteSyncRepository } from "./noteSyncRepository";

type NoteRow = typeof notes.$inferSelect;

export type SyncResult = {
  syncedIds: string[];
  serverWins: NoteRow[];
  skippedIds: string[];
};

export type NoteSyncUsecase = {
  getNotes: (userId: UserId, since?: string) => Promise<{ notes: NoteRow[] }>;
  syncNotes: (
    userId: UserId,
    noteList: UpsertNoteRequest[],
  ) => Promise<SyncResult>;
};

export function newNoteSyncUsecase(
  repo: NoteSyncRepository,
  tracer: Tracer,
): NoteSyncUsecase {
  return {
    getNotes: getNotes(repo, tracer),
    syncNotes: syncNotes(repo, tracer),
  };
}

function getNotes(repo: NoteSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ notes: NoteRow[] }> => {
    const result = await tracer.span("db.getNotesByUserId", () =>
      repo.getNotesByUserId(userId, since),
    );
    return { notes: result };
  };
}

function syncNotes(repo: NoteSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    noteList: UpsertNoteRequest[],
  ): Promise<SyncResult> => {
    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    // activityId ownership check
    const requestedActivityIds = [
      ...new Set(
        noteList
          .map((n) => n.activityId)
          .filter((id): id is string => id != null),
      ),
    ];

    const ownedActivityIds: string[] =
      requestedActivityIds.length > 0
        ? await tracer.span("db.getOwnedActivityIds", () =>
            repo.getOwnedActivityIds(userId, requestedActivityIds),
          )
        : [];

    const ownedActivityIdSet = new Set(ownedActivityIds);

    const validNotes = noteList.filter((note) => {
      if (
        new Date(note.updatedAt) > maxAllowed ||
        (note.activityId && !ownedActivityIdSet.has(note.activityId))
      ) {
        skippedIds.push(note.id);
        return false;
      }
      return true;
    });

    if (validNotes.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertNotes", () =>
      repo.upsertNotes(userId, validNotes),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validNotes
      .map((n) => n.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: NoteRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getNotesByIds", () =>
        repo.getNotesByIds(userId, missedIds),
      );
      const serverWinIdSet = new Set(serverWins.map((s) => s.id));
      for (const id of missedIds) {
        if (!serverWinIdSet.has(id)) {
          skippedIds.push(id);
        }
      }
    }

    return { syncedIds, serverWins, skippedIds };
  };
}
