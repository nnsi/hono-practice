import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mapApiActivityLog } from "@packages/sync-engine";

import { activityLogRepository } from "../repositories/activityLogRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

// チャンクごとに即座にmark処理を実行する。
// 全チャンク完了後の一括markだと、途中チャンク失敗時に成功分のmarkがスキップされる。
export async function syncActivityLogs(): Promise<void> {
  const gen = getSyncGeneration();
  const pending = await activityLogRepository.getPendingSyncActivityLogs();
  if (pending.length === 0) return;

  const logs = pending.map(({ _syncStatus, ...log }) => log);
  const chunks = chunkArray(logs);

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2["activity-logs"].sync.$post({
      json: { logs: chunk },
    });
    if (!res.ok) throw new Error(`syncActivityLogs failed: ${res.status}`);

    if (gen !== getSyncGeneration()) return;
    const data = (await res.json()) as SyncResult;
    await activityLogRepository.markActivityLogsSynced(data.syncedIds);
    if (gen !== getSyncGeneration()) return;
    await activityLogRepository.markActivityLogsFailed(data.skippedIds);
    if (gen !== getSyncGeneration()) return;
    if (data.serverWins.length > 0) {
      await activityLogRepository.upsertActivityLogsFromServer(
        data.serverWins.map(mapApiActivityLog),
      );
    }
  }
}
