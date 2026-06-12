import type { UpsertGoalRequest } from "@packages/types/sync/request/goal";

import type {
  mapApiActivityLog,
  mapApiGoal,
  mapApiGoalFreezePeriod,
  mapApiNote,
  mapApiTask,
} from "../mappers/apiMappers";

export type Pending = { _syncStatus: string };

export type GoalPending = Pending & {
  currentBalance: unknown;
  totalTarget: unknown;
  totalActual: unknown;
};

/** Minimal response shape shared by fetch Response and Hono typed client responses. */
export type V2ApiResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

/**
 * Per-entity sync POST endpoints. Each platform wires these to its own
 * Hono typed client (`apiClient.users.v2.<entity>.sync.$post`), so a backend
 * path or payload change surfaces as a compile error at the wiring site.
 */
export type V2SyncApi<
  TLog extends Pending,
  TTask extends Pending,
  TNote extends Pending,
  TFreeze extends Pending,
> = {
  postActivityLogs: (json: {
    logs: Omit<TLog, "_syncStatus">[];
  }) => Promise<V2ApiResponse>;
  postGoals: (json: { goals: UpsertGoalRequest[] }) => Promise<V2ApiResponse>;
  postTasks: (json: {
    tasks: Omit<TTask, "_syncStatus">[];
  }) => Promise<V2ApiResponse>;
  postNotes: (json: {
    notes: Omit<TNote, "_syncStatus">[];
  }) => Promise<V2ApiResponse>;
  postGoalFreezePeriods: (json: {
    freezePeriods: Omit<TFreeze, "_syncStatus">[];
  }) => Promise<V2ApiResponse>;
};

export type V2SyncRepos<
  TLog extends Pending,
  TGoal extends GoalPending,
  TTask extends Pending,
  TNote extends Pending,
  TFreeze extends Pending,
> = {
  activityLog: {
    getPendingSyncActivityLogs: () => Promise<TLog[]>;
    markActivityLogsSynced: (ids: string[]) => Promise<void>;
    markActivityLogsFailed: (ids: string[]) => Promise<void>;
    upsertActivityLogsFromServer: (
      wins: ReturnType<typeof mapApiActivityLog>[],
    ) => Promise<void>;
  };
  goal: {
    getPendingSyncGoals: () => Promise<TGoal[]>;
    markGoalsSynced: (ids: string[]) => Promise<void>;
    markGoalsFailed: (ids: string[]) => Promise<void>;
    upsertGoalsFromServer: (
      wins: ReturnType<typeof mapApiGoal>[],
    ) => Promise<void>;
  };
  task: {
    getPendingSyncTasks: () => Promise<TTask[]>;
    markTasksSynced: (ids: string[]) => Promise<void>;
    markTasksFailed: (ids: string[]) => Promise<void>;
    upsertTasksFromServer: (
      wins: ReturnType<typeof mapApiTask>[],
    ) => Promise<void>;
  };
  note: {
    getPendingSyncNotes: () => Promise<TNote[]>;
    markNotesSynced: (ids: string[]) => Promise<void>;
    markNotesFailed: (ids: string[]) => Promise<void>;
    upsertNotesFromServer: (
      wins: ReturnType<typeof mapApiNote>[],
    ) => Promise<void>;
  };
  goalFreezePeriod: {
    getPendingSyncFreezePeriods: () => Promise<TFreeze[]>;
    markFreezePeriodsSynced: (ids: string[]) => Promise<void>;
    markFreezePeriodsFailed: (ids: string[]) => Promise<void>;
    upsertFreezePeriodsFromServer: (
      wins: ReturnType<typeof mapApiGoalFreezePeriod>[],
    ) => Promise<void>;
  };
};
