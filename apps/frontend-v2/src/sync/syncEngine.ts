import { activityLogRepository } from "../db/activityLogRepository";
import { apiFetch } from "../utils/apiClient";
import type { SyncActivityLogsResponse } from "@packages/types-v2";

let isSyncing = false;
let retryCount = 0;
const BASE_DELAY_MS = 1000;

export const syncEngine = {
  async syncActivityLogs(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const pending = await activityLogRepository.getPendingSyncActivityLogs();
      if (pending.length === 0) return;

      // _syncStatus はサーバーに送らない
      const logs = pending.map(({ _syncStatus, ...log }) => log);

      const res = await apiFetch("/users/v2/activity-logs/sync", {
        method: "POST",
        body: JSON.stringify({ logs }),
      });

      if (res.ok) {
        const data: SyncActivityLogsResponse = await res.json();

        await activityLogRepository.markActivityLogsSynced(data.syncedIds);

        if (data.serverWins.length > 0) {
          await activityLogRepository.upsertActivityLogsFromServer(data.serverWins);
        }

        await activityLogRepository.markActivityLogsFailed(data.skippedIds);

        retryCount = 0;
      } else if (res.status === 401) {
        // JWT期限切れ → リフレッシュは apiClient が処理
      } else {
        retryCount++;
      }
    } catch {
      retryCount++;
    } finally {
      isSyncing = false;
    }
  },

  startAutoSync(intervalMs = 30000) {
    const sync = () => syncEngine.syncActivityLogs();

    window.addEventListener("online", sync);

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay =
        retryCount > 0
          ? Math.min(BASE_DELAY_MS * 2 ** retryCount, 5 * 60 * 1000)
          : intervalMs;
      timeoutId = setTimeout(async () => {
        if (navigator.onLine) await sync();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    // 即時同期
    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener("online", sync);
      clearTimeout(timeoutId);
    };
  },
};
