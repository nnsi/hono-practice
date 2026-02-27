import { goalRepository } from "../repositories/goalRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiGoal } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";

export async function syncGoals(): Promise<void> {
  const pending = await goalRepository.getPendingSyncGoals();
  if (pending.length === 0) return;

  // Strip _syncStatus and computed fields before sending to server
  const goals = pending.map(
    ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
  );

  const res = await apiClient.users.v2.goals.sync.$post({
    json: { goals },
  });
  if (!res.ok) return;

  const data: SyncResult = await res.json();

  await goalRepository.markGoalsSynced(data.syncedIds);
  await goalRepository.markGoalsFailed(data.skippedIds);
  if (data.serverWins.length > 0) {
    await goalRepository.upsertGoalsFromServer(
      data.serverWins.map(mapApiGoal),
    );
  }
}
