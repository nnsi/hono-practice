import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mapApiTask } from "@packages/sync-engine";

import { taskRepository } from "../db/taskRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

// チャンクごとに即座にmark処理を実行する。
// 全チャンク完了後の一括markだと、途中チャンク失敗時に成功分のmarkがスキップされる。
export async function syncTasks(): Promise<void> {
  const gen = getSyncGeneration();
  const pending = await taskRepository.getPendingSyncTasks();
  if (pending.length === 0) return;

  const tasks = pending.map(({ _syncStatus, ...t }) => t);
  const chunks = chunkArray(tasks);

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2.tasks.sync.$post({
      json: { tasks: chunk },
    });
    if (!res.ok) throw new Error(`syncTasks failed: ${res.status}`);

    if (gen !== getSyncGeneration()) return;
    const data = (await res.json()) as SyncResult;
    await taskRepository.markTasksSynced(data.syncedIds);
    if (gen !== getSyncGeneration()) return;
    await taskRepository.markTasksFailed(data.skippedIds);
    if (gen !== getSyncGeneration()) return;
    if (data.serverWins.length > 0) {
      await taskRepository.upsertTasksFromServer(
        data.serverWins.map(mapApiTask),
      );
    }
  }
}
