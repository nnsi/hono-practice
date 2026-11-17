import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { chunkArray } from "../core/chunkedSync";
import {
  type PendingSyncRecord,
  revisionsForIds,
  trackSyncResultTimestamps,
} from "../core/pushResult";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiNote } from "../mappers/apiMappers";

type SyncNotesDeps<T extends PendingSyncRecord> = {
  getPendingSyncNotes: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markNotesSynced: (revisions: SyncRevision[]) => Promise<void>;
  markNotesFailed: (revisions: SyncRevision[]) => Promise<void>;
  upsertNotesFromServer: (
    wins: ReturnType<typeof mapApiNote>[],
  ) => Promise<void>;
};

export function createSyncNotes<T extends PendingSyncRecord>(
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
      trackSyncResultTimestamps(data);

      if (gen !== getSyncGeneration()) return;
      await deps.markNotesSynced(revisionsForIds(pending, data.syncedIds));
      if (gen !== getSyncGeneration()) return;
      await deps.markNotesFailed(revisionsForIds(pending, data.skippedIds));
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertNotesFromServer(data.serverWins.map(mapApiNote));
      }
    }
  };
}
