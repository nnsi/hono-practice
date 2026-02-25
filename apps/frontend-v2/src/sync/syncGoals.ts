import { goalRepository } from "../db/goalRepository";
import { apiClient } from "../utils/apiClient";
import { mapApiGoal } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "./types";

export async function syncGoals(): Promise<void> {
  const pending = await goalRepository.getPendingSyncGoals();
  if (pending.length === 0) return;

  const goals = pending.map(
    ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
  );

  const res = await apiClient.users.v2.goals.sync.$post({
    json: { goals },
  });

  if (res.ok) {
    const data: SyncResult = await res.json();
    await goalRepository.markGoalsSynced(data.syncedIds);
    await goalRepository.markGoalsFailed(data.skippedIds);
    if (data.serverWins.length > 0) {
      await goalRepository.upsertGoalsFromServer(
        data.serverWins.map(mapApiGoal),
      );
    }
  }
}
