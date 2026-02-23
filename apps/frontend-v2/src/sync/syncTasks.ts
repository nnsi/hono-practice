import { taskRepository } from "../db/taskRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiTask } from "../utils/apiMappers";
import type { SyncResult } from "./types";

export async function syncTasks(): Promise<void> {
  const pending = await taskRepository.getPendingSyncTasks();
  if (pending.length === 0) return;

  const tasks = pending.map(({ _syncStatus, ...t }) => t);

  const res = await apiClient.users.v2.tasks.sync.$post({
    json: { tasks },
  });

  if (res.ok) {
    const data: SyncResult = await res.json();
    await taskRepository.markTasksSynced(data.syncedIds);
    await taskRepository.markTasksFailed(data.skippedIds);
    if (data.serverWins.length > 0) {
      await taskRepository.upsertTasksFromServer(
        data.serverWins.map(mapApiTask),
      );
    }
  }
}
