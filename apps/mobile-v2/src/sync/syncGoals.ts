import { goalRepository } from "../repositories/goalRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiGoal } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";
import { chunkArray, mergeSyncResults } from "@packages/domain/sync/chunkedSync";

export async function syncGoals(): Promise<void> {
  const pending = await goalRepository.getPendingSyncGoals();
  if (pending.length === 0) return;

  const goals = pending.map(
    ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
  );
  const chunks = chunkArray(goals);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    const res = await apiClient.users.v2.goals.sync.$post({
      json: { goals: chunk },
    });
    if (!res.ok) return;
    results.push(await res.json() as SyncResult);
  }

  const data = mergeSyncResults(results);
  await goalRepository.markGoalsSynced(data.syncedIds);
  await goalRepository.markGoalsFailed(data.skippedIds);
  if (data.serverWins.length > 0) {
    await goalRepository.upsertGoalsFromServer(
      data.serverWins.map(mapApiGoal),
    );
  }
}
