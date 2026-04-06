import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiNote } from "../mappers/apiMappers";

type SyncNotesDeps<T extends { _syncStatus: string }> = {
  getPendingSyncNotes: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markNotesSynced: (ids: string[]) => Promise<void>;
  markNotesFailed: (ids: string[]) => Promise<void>;
  upsertNotesFromServer: (
    wins: ReturnType<typeof mapApiNote>[],
  ) => Promise<void>;
};

export function createSyncNotes<T extends { _syncStatus: string }>(
  deps: SyncNotesDeps<T>,
) {
  return async function syncNotes(): Promise<void> {
    const gen = getSyncGeneration();
    const pending = await deps.getPendingSyncNotes();
    if (pending.length === 0) return;

    const notes = pending.map(({ _syncStatus, ...n }) => n);
    const chunks = chunkArray(notes);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);

      if (gen !== getSyncGeneration()) return;
      await deps.markNotesSynced(data.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markNotesFailed(data.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertNotesFromServer(data.serverWins.map(mapApiNote));
      }
    }
  };
}
