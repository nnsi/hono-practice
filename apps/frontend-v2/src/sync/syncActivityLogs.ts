import type { SyncResult } from "@packages/sync-engine";
import {
  chunkArray,
  mapApiActivityLog,
  mergeSyncResults,
} from "@packages/sync-engine";

import { activityLogRepository } from "../db/activityLogRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

export async function syncActivityLogs(): Promise<void> {
  const gen = getSyncGeneration();
  const pending = await activityLogRepository.getPendingSyncActivityLogs();
  if (pending.length === 0) return;

  const logs = pending.map(({ _syncStatus, ...log }) => log);
  const chunks = chunkArray(logs);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2["activity-logs"].sync.$post({
      json: { logs: chunk },
    });
    if (!res.ok) throw new Error(`syncActivityLogs failed: ${res.status}`);
    results.push((await res.json()) as SyncResult);
  }

  if (gen !== getSyncGeneration()) return;

  const data = mergeSyncResults(results);
  await activityLogRepository.markActivityLogsSynced(data.syncedIds);
  if (gen !== getSyncGeneration()) return;
  if (data.serverWins.length > 0) {
    await activityLogRepository.upsertActivityLogsFromServer(
      data.serverWins.map(mapApiActivityLog),
    );
    if (gen !== getSyncGeneration()) return;
  }
  if (gen !== getSyncGeneration()) return;
  await activityLogRepository.markActivityLogsFailed(data.skippedIds);
}
