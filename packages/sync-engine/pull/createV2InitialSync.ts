import type { StorageAdapter } from "@packages/platform";

import { createInitialSync } from "./createInitialSync";
import type { ApiResponse, ParsedSyncData } from "./parseResponses";

const DELTA_SYNC_RESOURCES = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
  "notes",
] as const;

// Keep this list frozen. Future sync resources should be added only to
// DELTA_SYNC_RESOURCES so older clients full-pull the new resource once.
const LEGACY_BOOTSTRAPPED_RESOURCES = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
] as const;

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
  task: {
    upsertTasksFromServer: (t: ParsedSyncData["tasks"]) => Promise<void>;
  };
  note: {
    upsertNotesFromServer: (n: ParsedSyncData["notes"]) => Promise<void>;
  };
};

type V2InitialSyncDeps = {
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

/**
 * Standard v2 initial sync shared by Web and Mobile. Owns the sync resource
 * lists and the fetch/write fan-out so a new entity is wired once; platforms
 * inject only typed endpoints, repositories and local-DB plumbing.
 */
export function createV2InitialSync(deps: V2InitialSyncDeps) {
  return createInitialSync({
    clearAllTables: deps.clearAllTables,
    updateAuthState: deps.updateAuthState,
    isLocalDataEmpty: deps.isLocalDataEmpty,
    fetchAllApis: async (sinceByResource) => {
      const logsQuery = sinceByResource.logs
        ? { since: sinceByResource.logs }
        : {};
      const goalsQuery = sinceByResource.goals
        ? { since: sinceByResource.goals, clientDate: deps.getClientDate() }
        : { clientDate: deps.getClientDate() };
      const freezePeriodsQuery = sinceByResource.freezePeriods
        ? { since: sinceByResource.freezePeriods }
        : {};
      const tasksQuery = sinceByResource.tasks
        ? { since: sinceByResource.tasks }
        : {};
      const notesQuery = sinceByResource.notes
        ? { since: sinceByResource.notes }
        : {};
      const [
        activitiesRes,
        logsRes,
        goalsRes,
        freezePeriodsRes,
        tasksRes,
        notesRes,
      ] = await Promise.all([
        deps.api.getActivities(),
        deps.api.getActivityLogs(logsQuery),
        deps.api.getGoals(goalsQuery),
        // Older backend deployments may still lack this endpoint during staged
        // rollout. Network failures fall back to null on both Web and Mobile.
        deps.api
          .getGoalFreezePeriods(freezePeriodsQuery)
          .catch(() => null),
        deps.api.getTasks(tasksQuery),
        // Notes are best-effort during bootstrap. Treat network failures as a
        // partial sync so other resources can still hydrate and watermark stays put.
        deps.api
          .getNotes(notesQuery)
          .catch(() => null),
      ]);
      return {
        activitiesRes,
        logsRes,
        goalsRes,
        freezePeriodsRes,
        tasksRes,
        notesRes,
      };
    },
    writeAllData: async (data) => {
      const write = async () => {
        if (data.activities.length > 0) {
          await deps.repos.activity.upsertActivities(data.activities);
        }
        if (data.activityKinds.length > 0) {
          await deps.repos.activity.upsertActivityKinds(data.activityKinds);
        }
        if (data.logs.length > 0) {
          await deps.repos.activityLog.upsertActivityLogsFromServer(data.logs);
        }
        if (data.goals.length > 0) {
          await deps.repos.goal.upsertGoalsFromServer(data.goals);
        }
        if (data.freezePeriods.length > 0) {
          await deps.repos.goalFreezePeriod.upsertFreezePeriodsFromServer(
            data.freezePeriods,
          );
        }
        if (data.tasks.length > 0) {
          await deps.repos.task.upsertTasksFromServer(data.tasks);
        }
        if (data.notes.length > 0) {
          await deps.repos.note.upsertNotesFromServer(data.notes);
        }
      };
      if (deps.runWriteTransaction) {
        await deps.runWriteTransaction(write);
      } else {
        await write();
      }
    },
    deltaResources: DELTA_SYNC_RESOURCES,
    legacyBootstrappedResources: LEGACY_BOOTSTRAPPED_RESOURCES,
    defaultStorage: deps.defaultStorage,
    onError: deps.onError,
  });
}
