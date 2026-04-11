import type { StorageAdapter } from "@packages/platform";

import { getSafeSyncWatermarkISOString } from "../core/serverTime";
import { getSyncGeneration, invalidateSync } from "../core/syncState";
import type { ParsedSyncData } from "./parseResponses";
import { type ApiResponse, parseResponses } from "./parseResponses";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";
const BOOTSTRAPPED_RESOURCES_KEY = "actiko-v2-bootstrappedResources";

type DeltaSyncResource = "logs" | "goals" | "freezePeriods" | "tasks" | "notes";

type SinceByResource = Partial<Record<DeltaSyncResource, string>>;

type FetchAllApis = (sinceByResource: SinceByResource) => Promise<{
  activitiesRes: ApiResponse;
  logsRes: ApiResponse;
  goalsRes: ApiResponse;
  freezePeriodsRes: ApiResponse | null;
  tasksRes: ApiResponse;
  notesRes?: ApiResponse | null;
}>;

type InitialSyncDeps = {
  clearAllTables: () => Promise<void>;
  updateAuthState: (userId: string) => Promise<void>;
  isLocalDataEmpty: () => Promise<boolean>;
  fetchAllApis: FetchAllApis;
  writeAllData: (data: ParsedSyncData) => Promise<void>;
  deltaResources: readonly DeltaSyncResource[];
  legacyBootstrappedResources: readonly DeltaSyncResource[];
  defaultStorage: StorageAdapter;
  onError?: (
    error: unknown,
    phase: "fetchAllApis" | "parseResponses" | "writeAllData",
  ) => void;
};

function readBootstrappedResources(
  storage: StorageAdapter,
  fallback: readonly DeltaSyncResource[],
): Set<DeltaSyncResource> {
  const raw = storage.getItem(BOOTSTRAPPED_RESOURCES_KEY);
  if (!raw) return new Set(fallback);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(fallback);
    return new Set(
      parsed.filter(
        (resource): resource is DeltaSyncResource =>
          typeof resource === "string",
      ),
    );
  } catch {
    return new Set(fallback);
  }
}

function writeBootstrappedResources(
  storage: StorageAdapter,
  resources: Iterable<DeltaSyncResource>,
): void {
  storage.setItem(
    BOOTSTRAPPED_RESOURCES_KEY,
    JSON.stringify([...new Set(resources)]),
  );
}

export function createInitialSync(deps: InitialSyncDeps) {
  let isPulling = false;

  async function clearLocalData(
    storage: StorageAdapter = deps.defaultStorage,
  ): Promise<void> {
    invalidateSync();
    await deps.clearAllTables();
    storage.removeItem(LAST_SYNCED_KEY);
    storage.removeItem(BOOTSTRAPPED_RESOURCES_KEY);
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
    let bootstrappedResources = readBootstrappedResources(
      storage,
      deps.legacyBootstrappedResources,
    );
    if (lastSyncedAt) {
      const isEmpty = await deps.isLocalDataEmpty();
      if (isEmpty) {
        storage.removeItem(LAST_SYNCED_KEY);
        storage.removeItem(BOOTSTRAPPED_RESOURCES_KEY);
        lastSyncedAt = null;
        bootstrappedResources = new Set();
      }
    }
    const sinceByResource = deps.deltaResources.reduce<SinceByResource>(
      (acc, resource) => {
        if (lastSyncedAt && bootstrappedResources.has(resource)) {
          acc[resource] = lastSyncedAt;
        }
        return acc;
      },
      {},
    );

    const gen = getSyncGeneration();

    let responses: Awaited<ReturnType<FetchAllApis>>;
    try {
      responses = await deps.fetchAllApis(sinceByResource);
    } catch (err) {
      deps.onError?.(err, "fetchAllApis");
      throw err;
    }
    const {
      activitiesRes,
      logsRes,
      goalsRes,
      freezePeriodsRes,
      tasksRes,
      notesRes,
    } = responses;

    if (gen !== getSyncGeneration()) return;

    let parsed: { allSynced: boolean; data: ParsedSyncData };
    try {
      parsed = await parseResponses(
        activitiesRes,
        logsRes,
        goalsRes,
        freezePeriodsRes,
        tasksRes,
        notesRes,
      );
    } catch (err) {
      deps.onError?.(err, "parseResponses");
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
      parsed.data.notes.length > 0 ||
      parsed.data.tasks.length > 0;

    if (hasData) {
      try {
        await deps.writeAllData(parsed.data);
      } catch (err) {
        deps.onError?.(err, "writeAllData");
        throw err;
      }
    }

    if (gen !== getSyncGeneration()) return;

    if (allSynced) {
      storage.setItem(
        LAST_SYNCED_KEY,
        getSafeSyncWatermarkISOString([
          activitiesRes,
          logsRes,
          goalsRes,
          freezePeriodsRes,
          tasksRes,
          notesRes,
        ]),
      );
      writeBootstrappedResources(storage, [
        ...bootstrappedResources,
        ...deps.deltaResources,
      ]);
    }
  }

  return { clearLocalData, performInitialSync };
}
