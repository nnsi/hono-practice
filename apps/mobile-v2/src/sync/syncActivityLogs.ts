import { activityLogRepository } from "../repositories/activityLogRepository";
import { apiSyncActivityLogs } from "../utils/apiClient";
import { mapApiActivityLog } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";

export async function syncActivityLogs(): Promise<void> {
  const pending = await activityLogRepository.getPendingSyncActivityLogs();
  if (pending.length === 0) return;

  // Strip _syncStatus before sending to server
  const logs = pending.map(({ _syncStatus, ...log }) => log);

  const res = await apiSyncActivityLogs({ logs });
  if (!res.ok) return;

  const data: SyncResult = await res.json();

  await activityLogRepository.markActivityLogsSynced(data.syncedIds);
  if (data.serverWins.length > 0) {
    await activityLogRepository.upsertActivityLogsFromServer(
      data.serverWins.map(mapApiActivityLog),
    );
  }
  await activityLogRepository.markActivityLogsFailed(data.skippedIds);
}
