import { taskRepository } from "../db/taskRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiTask } from "@packages/sync-engine";
import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mergeSyncResults } from "@packages/sync-engine";

export async function syncTasks(): Promise<void> {
  const pending = await taskRepository.getPendingSyncTasks();
  if (pending.length === 0) return;

  const tasks = pending.map(({ _syncStatus, ...t }) => t);
  const chunks = chunkArray(tasks);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    const res = await apiClient.users.v2.tasks.sync.$post({
      json: { tasks: chunk },
    });
    if (!res.ok) return;
    results.push(await res.json() as SyncResult);
  }

  const data = mergeSyncResults(results);
  await taskRepository.markTasksSynced(data.syncedIds);
  await taskRepository.markTasksFailed(data.skippedIds);
  if (data.serverWins.length > 0) {
    await taskRepository.upsertTasksFromServer(
      data.serverWins.map(mapApiTask),
    );
  }
}
