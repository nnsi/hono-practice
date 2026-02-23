import { activityLogRepository } from "../db/activityLogRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiActivityLog } from "../utils/apiMappers";
import type { SyncResult } from "./types";

export async function syncActivityLogs(): Promise<void> {
  const pending = await activityLogRepository.getPendingSyncActivityLogs();
  if (pending.length === 0) return;

  const logs = pending.map(({ _syncStatus, ...log }) => log);

  const res = await apiClient.users.v2["activity-logs"].sync.$post({
    json: { logs },
  });

  if (res.ok) {
    const data: SyncResult = await res.json();
    await activityLogRepository.markActivityLogsSynced(data.syncedIds);
    if (data.serverWins.length > 0) {
      await activityLogRepository.upsertActivityLogsFromServer(
        data.serverWins.map(mapApiActivityLog),
      );
    }
    await activityLogRepository.markActivityLogsFailed(data.skippedIds);
  }
}
