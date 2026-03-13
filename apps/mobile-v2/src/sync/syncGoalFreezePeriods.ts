import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mapApiGoalFreezePeriod } from "@packages/sync-engine";

import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { apiClient } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

export async function syncGoalFreezePeriods(): Promise<void> {
  const gen = getSyncGeneration();
  const pending =
    await goalFreezePeriodRepository.getPendingSyncFreezePeriods();
  if (pending.length === 0) return;

  const freezePeriods = pending.map(({ _syncStatus, ...fp }) => fp);
  const chunks = chunkArray(freezePeriods);

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2["goal-freeze-periods"].sync.$post({
      json: { freezePeriods: chunk },
    });
    if (!res.ok) throw new Error(`syncGoalFreezePeriods failed: ${res.status}`);

    if (gen !== getSyncGeneration()) return;
    const data = (await res.json()) as SyncResult;
    await goalFreezePeriodRepository.markFreezePeriodsSynced(data.syncedIds);
    if (gen !== getSyncGeneration()) return;
    await goalFreezePeriodRepository.markFreezePeriodsFailed(data.skippedIds);
    if (gen !== getSyncGeneration()) return;
    if (data.serverWins.length > 0) {
      await goalFreezePeriodRepository.upsertFreezePeriodsFromServer(
        data.serverWins.map(mapApiGoalFreezePeriod),
      );
    }
  }
}
