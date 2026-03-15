import type { SyncResult } from "@packages/sync-engine";
import { chunkArray, mapApiGoalFreezePeriod } from "@packages/sync-engine";

import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { customFetch } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

export async function syncGoalFreezePeriods(): Promise<void> {
  const gen = getSyncGeneration();
  const pending =
    await goalFreezePeriodRepository.getPendingSyncFreezePeriods();
  if (pending.length === 0) return;

  const freezePeriods = pending.map(({ _syncStatus, ...fp }) => fp);
  const chunks = chunkArray(freezePeriods);

  for (const chunk of chunks) {
    if (gen !== getSyncGeneration()) return;
    const res = await customFetch(
      `${API_URL}/users/v2/goal-freeze-periods/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freezePeriods: chunk }),
      },
    );
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
