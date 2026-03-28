import type { StorageAdapter } from "@packages/platform";

import { getSyncGeneration, invalidateSync } from "../core/syncState";
import type { ParsedSyncData } from "./parseResponses";
import { type ApiResponse, parseResponses } from "./parseResponses";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

type FetchAllApis = (sinceQuery: { since?: string }) => Promise<{
  activitiesRes: ApiResponse;
  logsRes: ApiResponse;
  goalsRes: ApiResponse;
  freezePeriodsRes: ApiResponse | null;
  tasksRes: ApiResponse;
}>;

type InitialSyncDeps = {
  clearAllTables: () => Promise<void>;
  updateAuthState: (userId: string) => Promise<void>;
  isLocalDataEmpty: () => Promise<boolean>;
  fetchAllApis: FetchAllApis;
  writeAllData: (data: ParsedSyncData) => Promise<void>;
  defaultStorage: StorageAdapter;
};

export function createInitialSync(deps: InitialSyncDeps) {
  let isPulling = false;

  async function clearLocalData(
    storage: StorageAdapter = deps.defaultStorage,
  ): Promise<void> {
    invalidateSync();
    await deps.clearAllTables();
    storage.removeItem(LAST_SYNCED_KEY);
  }

  async function performInitialSync(
    userId: string,
    storage: StorageAdapter = deps.defaultStorage,
  ): Promise<void> {
    if (isPulling) return;
    isPulling = true;
    try {
      await performInitialSyncInner(userId, storage);
    } finally {
      isPulling = false;
    }
  }

  async function performInitialSyncInner(
    userId: string,
    storage: StorageAdapter,
  ): Promise<void> {
    await deps.updateAuthState(userId);

    let lastSyncedAt = storage.getItem(LAST_SYNCED_KEY);
    if (lastSyncedAt) {
      const isEmpty = await deps.isLocalDataEmpty();
      if (isEmpty) {
        storage.removeItem(LAST_SYNCED_KEY);
        lastSyncedAt = null;
      }
    }
    const sinceQuery = lastSyncedAt ? { since: lastSyncedAt } : {};

    const gen = getSyncGeneration();

    let responses: Awaited<ReturnType<FetchAllApis>>;
    try {
      responses = await deps.fetchAllApis(sinceQuery);
    } catch (err) {
      console.error("[sync] fetchAllApis failed:", err);
      throw err;
    }
    const { activitiesRes, logsRes, goalsRes, freezePeriodsRes, tasksRes } =
      responses;

    if (gen !== getSyncGeneration()) return;

    let parsed: { allSynced: boolean; data: ParsedSyncData };
    try {
      parsed = await parseResponses(
        activitiesRes,
        logsRes,
        goalsRes,
        freezePeriodsRes,
        tasksRes,
      );
    } catch (err) {
      console.error("[sync] parseResponses failed:", err);
      throw err;
    }
    const allSynced = parsed.allSynced;

    if (gen !== getSyncGeneration()) return;

    const hasData =
      parsed.data.activities.length > 0 ||
      parsed.data.activityKinds.length > 0 ||
      parsed.data.logs.length > 0 ||
      parsed.data.goals.length > 0 ||
      parsed.data.freezePeriods.length > 0 ||
      parsed.data.tasks.length > 0;

    if (hasData) {
      try {
        await deps.writeAllData(parsed.data);
      } catch (err) {
        console.error("[sync] writeAllData failed:", err);
        throw err;
      }
    }

    if (gen !== getSyncGeneration()) return;

    if (allSynced) {
      storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    }
  }

  return { clearLocalData, performInitialSync };
}
