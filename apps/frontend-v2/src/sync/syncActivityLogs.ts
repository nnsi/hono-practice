import { activityLogRepository } from "../db/activityLogRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiActivityLog } from "@packages/sync-engine";
import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mergeSyncResults } from "@packages/sync-engine";

export async function syncActivityLogs(): Promise<void> {
  const pending = await activityLogRepository.getPendingSyncActivityLogs();
  if (pending.length === 0) return;

  const logs = pending.map(({ _syncStatus, ...log }) => log);
  const chunks = chunkArray(logs);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    const res = await apiClient.users.v2["activity-logs"].sync.$post({
      json: { logs: chunk },
    });
    if (!res.ok) return;
    results.push(await res.json() as SyncResult);
  }

  const data = mergeSyncResults(results);
  await activityLogRepository.markActivityLogsSynced(data.syncedIds);
  if (data.serverWins.length > 0) {
    await activityLogRepository.upsertActivityLogsFromServer(
      data.serverWins.map(mapApiActivityLog),
    );
  }
  await activityLogRepository.markActivityLogsFailed(data.skippedIds);
}
