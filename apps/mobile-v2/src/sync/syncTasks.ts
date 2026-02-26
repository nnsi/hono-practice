import { taskRepository } from "../repositories/taskRepository";
import { apiSyncTasks } from "../utils/apiClient";
import { mapApiTask } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";

export async function syncTasks(): Promise<void> {
  const pending = await taskRepository.getPendingSyncTasks();
  if (pending.length === 0) return;

  // Strip _syncStatus before sending to server
  const tasks = pending.map(({ _syncStatus, ...t }) => t);

  const res = await apiSyncTasks({ tasks });
  if (!res.ok) return;

  const data: SyncResult = await res.json();

  await taskRepository.markTasksSynced(data.syncedIds);
  await taskRepository.markTasksFailed(data.skippedIds);
  if (data.serverWins.length > 0) {
    await taskRepository.upsertTasksFromServer(
      data.serverWins.map(mapApiTask),
    );
  }
}
