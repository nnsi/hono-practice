import { chunkArray } from "../core/chunkedSync";
import { withSyncDataWrite } from "../core/syncDataWrites";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiTaskSchedule } from "../mappers/apiMappers";

export type TaskSchedulePending = {
  _syncStatus: string;
  id: string;
  updatedAt: string;
};

type SyncTaskSchedulesDeps<T extends TaskSchedulePending> = {
  getPendingSyncTaskSchedules: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markTaskSchedulesSynced: (ids: string[]) => Promise<void>;
  markTaskSchedulesFailed: (ids: string[]) => Promise<void>;
  upsertTaskSchedulesFromServer: (
    wins: ReturnType<typeof mapApiTaskSchedule>[],
    sentSnapshots?: readonly { id: string; updatedAt: string }[],
  ) => Promise<void>;
};

export function createSyncTaskSchedules<T extends TaskSchedulePending>(
  deps: SyncTaskSchedulesDeps<T>,
) {
  return async function syncTaskSchedules(): Promise<void> {
    const gen = getSyncGeneration();
    const pending = await deps.getPendingSyncTaskSchedules();
    if (pending.length === 0) return;

    const taskSchedules = pending.map(({ _syncStatus, ...fp }) => fp);
    const chunks = chunkArray(taskSchedules);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);

      await withSyncDataWrite(gen, async () => {
        if (gen !== getSyncGeneration()) return;
        await deps.markTaskSchedulesSynced(data.syncedIds);
        if (gen !== getSyncGeneration()) return;
        await deps.markTaskSchedulesFailed(data.skippedIds);
        if (gen !== getSyncGeneration()) return;
        if (data.serverWins.length > 0) {
          await deps.upsertTaskSchedulesFromServer(
            data.serverWins.map(mapApiTaskSchedule),
            chunk,
          );
        }
      });
    }
  };
}
