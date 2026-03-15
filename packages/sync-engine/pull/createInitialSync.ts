import type { StorageAdapter } from "@packages/platform";

import { getSyncGeneration, invalidateSync } from "../core/syncState";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiGoalFreezePeriod,
  mapApiTask,
} from "../mappers/apiMappers";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

type ApiResponse = { ok: boolean; json: () => Promise<unknown> };

type FetchAllApis = (sinceQuery: { since?: string }) => Promise<{
  activitiesRes: ApiResponse;
  logsRes: ApiResponse;
  goalsRes: ApiResponse;
  freezePeriodsRes: ApiResponse | null;
  tasksRes: ApiResponse;
}>;

type ParsedSyncData = {
  activities: ReturnType<typeof mapApiActivity>[];
  activityKinds: ReturnType<typeof mapApiActivityKind>[];
  logs: ReturnType<typeof mapApiActivityLog>[];
  goals: ReturnType<typeof mapApiGoal>[];
  freezePeriods: ReturnType<typeof mapApiGoalFreezePeriod>[];
  tasks: ReturnType<typeof mapApiTask>[];
};

type InitialSyncDeps = {
  clearAllTables: () => Promise<void>;
  updateAuthState: (userId: string) => Promise<void>;
  isLocalDataEmpty: () => Promise<boolean>;
  fetchAllApis: FetchAllApis;
  writeAllData: (data: ParsedSyncData) => Promise<void>;
  defaultStorage: StorageAdapter;
};

export function createInitialSync(deps: InitialSyncDeps) {
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

    const { activitiesRes, logsRes, goalsRes, freezePeriodsRes, tasksRes } =
      await deps.fetchAllApis(sinceQuery);

    if (gen !== getSyncGeneration()) return;

    const parsed = await parseResponses(
      activitiesRes,
      logsRes,
      goalsRes,
      freezePeriodsRes,
      tasksRes,
    );
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
      await deps.writeAllData(parsed.data);
    }

    if (gen !== getSyncGeneration()) return;

    if (allSynced) {
      storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    }
  }

  return { clearLocalData, performInitialSync };
}

async function parseResponses(
  activitiesRes: ApiResponse,
  logsRes: ApiResponse,
  goalsRes: ApiResponse,
  freezePeriodsRes: ApiResponse | null,
  tasksRes: ApiResponse,
): Promise<{ allSynced: boolean; data: ParsedSyncData }> {
  let allSynced = true;
  const data: ParsedSyncData = {
    activities: [],
    activityKinds: [],
    logs: [],
    goals: [],
    freezePeriods: [],
    tasks: [],
  };

  if (activitiesRes.ok) {
    const raw = (await activitiesRes.json()) as {
      activities: (Record<string, unknown> & { id: string })[];
      activityKinds?: (Record<string, unknown> & { id: string })[];
    };
    data.activities = raw.activities.map(mapApiActivity);
    if (raw.activityKinds && raw.activityKinds.length > 0) {
      data.activityKinds = raw.activityKinds.map(mapApiActivityKind);
    }
  } else {
    allSynced = false;
  }

  if (logsRes.ok) {
    const raw = (await logsRes.json()) as {
      logs?: (Record<string, unknown> & { id: string })[];
    };
    if (raw.logs && raw.logs.length > 0) {
      data.logs = raw.logs.map(mapApiActivityLog);
    }
  } else {
    allSynced = false;
  }

  if (goalsRes.ok) {
    const raw = (await goalsRes.json()) as {
      goals?: (Record<string, unknown> & { id: string })[];
    };
    if (raw.goals && raw.goals.length > 0) {
      data.goals = raw.goals.map(mapApiGoal);
    }
  } else {
    allSynced = false;
  }

  if (freezePeriodsRes?.ok) {
    const raw = (await freezePeriodsRes.json()) as {
      freezePeriods?: (Record<string, unknown> & { id: string })[];
    };
    if (raw.freezePeriods && raw.freezePeriods.length > 0) {
      data.freezePeriods = raw.freezePeriods.map(mapApiGoalFreezePeriod);
    }
  } else if (freezePeriodsRes === null || !freezePeriodsRes?.ok) {
    allSynced = false;
  }

  if (tasksRes.ok) {
    const raw = (await tasksRes.json()) as {
      tasks?: (Record<string, unknown> & { id: string })[];
    };
    if (raw.tasks && raw.tasks.length > 0) {
      data.tasks = raw.tasks.map(mapApiTask);
    }
  } else {
    allSynced = false;
  }

  return { allSynced, data };
}
