import type { SyncResult } from "@packages/sync-engine";
import {
  chunkArray,
  mapApiGoal,
  mergeSyncResults,
} from "@packages/sync-engine";

import { goalRepository } from "../db/goalRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

export async function syncGoals(): Promise<void> {
  const gen = getSyncGeneration();
  const pending = await goalRepository.getPendingSyncGoals();
  if (pending.length === 0) return;

  const goals = pending.map(
    ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
  );
  const chunks = chunkArray(goals);
  const results: SyncResult[] = [];

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2.goals.sync.$post({
      json: { goals: chunk },
    });
    if (!res.ok) throw new Error(`syncGoals failed: ${res.status}`);
    results.push((await res.json()) as SyncResult);
  }

  if (gen !== getSyncGeneration()) return;

  const data = mergeSyncResults(results);
  await goalRepository.markGoalsSynced(data.syncedIds);
  if (gen !== getSyncGeneration()) return;
  await goalRepository.markGoalsFailed(data.skippedIds);
  if (gen !== getSyncGeneration()) return;
  if (data.serverWins.length > 0) {
    await goalRepository.upsertGoalsFromServer(data.serverWins.map(mapApiGoal));
  }
}
