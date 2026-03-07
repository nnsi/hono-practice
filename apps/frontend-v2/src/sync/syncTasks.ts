import type { SyncResult } from "@packages/sync-engine";
import {
  chunkArray,
  mapApiTask,
  mergeSyncResults,
} from "@packages/sync-engine";

import { taskRepository } from "../db/taskRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

export async function syncTasks(): Promise<void> {
  const gen = getSyncGeneration();
  const pending = await taskRepository.getPendingSyncTasks();
  if (pending.length === 0) return;

  const tasks = pending.map(({ _syncStatus, ...t }) => t);
  const chunks = chunkArray(tasks);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2.tasks.sync.$post({
      json: { tasks: chunk },
    });
    if (!res.ok) throw new Error(`syncTasks failed: ${res.status}`);
    results.push((await res.json()) as SyncResult);
  }

  if (gen !== getSyncGeneration()) return;

  const data = mergeSyncResults(results);
  await taskRepository.markTasksSynced(data.syncedIds);
  if (gen !== getSyncGeneration()) return;
  await taskRepository.markTasksFailed(data.skippedIds);
  if (gen !== getSyncGeneration()) return;
  if (data.serverWins.length > 0) {
    await taskRepository.upsertTasksFromServer(data.serverWins.map(mapApiTask));
  }
}
