import type { StorageAdapter } from "@packages/platform";

import type { ApiResponse, ParsedSyncData } from "./parseResponses";

type SinceQuery = { since?: string };

/**
 * Per-resource pull endpoints. Each platform wires these to its own Hono
 * typed client (`apiClient.users.v2.<resource>.$get`), so a backend path or
 * query change surfaces as a compile error at the wiring site.
 */
type V2PullApi = {
  getActivities: () => Promise<ApiResponse>;
  getActivityLogs: (query: SinceQuery) => Promise<ApiResponse>;
  getGoals: (
    query: SinceQuery & { clientDate: string },
  ) => Promise<ApiResponse>;
  getGoalFreezePeriods: (query: SinceQuery) => Promise<ApiResponse>;
  getTaskSchedules: (query: SinceQuery) => Promise<ApiResponse>;
  getTasks: (query: SinceQuery) => Promise<ApiResponse>;
  getNotes: (query: SinceQuery) => Promise<ApiResponse>;
};

type V2PullRepos = {
  activity: {
    upsertActivities: (a: ParsedSyncData["activities"]) => Promise<void>;
    upsertActivityKinds: (k: ParsedSyncData["activityKinds"]) => Promise<void>;
  };
  activityLog: {
    upsertActivityLogsFromServer: (l: ParsedSyncData["logs"]) => Promise<void>;
  };
  goal: {
    upsertGoalsFromServer: (g: ParsedSyncData["goals"]) => Promise<void>;
  };
  goalFreezePeriod: {
    upsertFreezePeriodsFromServer: (
      f: ParsedSyncData["freezePeriods"],
    ) => Promise<void>;
  };
  taskSchedule: {
    upsertTaskSchedulesFromServer: (
      s: ParsedSyncData["taskSchedules"],
    ) => Promise<void>;
  };
  task: {
    upsertTasksFromServer: (t: ParsedSyncData["tasks"]) => Promise<void>;
  };
  note: {
    upsertNotesFromServer: (n: ParsedSyncData["notes"]) => Promise<void>;
  };
};

export type V2InitialSyncDeps = {
  api: V2PullApi;
  repos: V2PullRepos;
  /** Returns today's date string for the goals query (e.g. getToday()). */
  getClientDate: () => string;
  clearAllTables: () => Promise<void>;
  updateAuthState: (userId: string) => Promise<void>;
  isLocalDataEmpty: () => Promise<boolean>;
  /**
   * Optional wrapper committing the multi-store pull atomically.
   * Web passes a Dexie rw-transaction wrapper; Mobile omits it because its
   * repositories manage sqlite transactions internally (an outer
   * withTransactionAsync would nest BEGIN/COMMIT).
   */
  runWriteTransaction?: (write: () => Promise<void>) => Promise<void>;
  defaultStorage: StorageAdapter;
  onError?: (
    error: unknown,
    phase: "fetchAllApis" | "parseResponses" | "writeAllData",
  ) => void;
};
