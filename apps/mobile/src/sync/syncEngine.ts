import { createSyncEngine, createV2SyncFunctions } from "@packages/sync-engine";

import { apiClient } from "../api/apiClient";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { noteRepository } from "../repositories/noteRepository";
import { taskRepository } from "../repositories/taskRepository";
import { reportError } from "../utils/errorReporter";
import { rnNetworkAdapter } from "./rnPlatformAdapters";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";

const entitySyncs = createV2SyncFunctions({
  api: {
    postActivityLogs: (json) =>
      apiClient.users.v2["activity-logs"].sync.$post({ json }),
    postGoals: (json) => apiClient.users.v2.goals.sync.$post({ json }),
    postTasks: (json) => apiClient.users.v2.tasks.sync.$post({ json }),
    postNotes: (json) => apiClient.users.v2.notes.sync.$post({ json }),
    postGoalFreezePeriods: (json) =>
      apiClient.users.v2["goal-freeze-periods"].sync.$post({ json }),
  },
  repos: {
    activityLog: activityLogRepository,
    goal: goalRepository,
    task: taskRepository,
    note: noteRepository,
    goalFreezePeriod: goalFreezePeriodRepository,
  },
});

export const syncEngine = createSyncEngine(
  {
    syncActivityIconDeletions,
    syncActivities,
    syncActivityIcons,
    ...entitySyncs,
  },
  rnNetworkAdapter,
  (error, phase) => {
    reportError({
      errorType: "unhandled_error",
      message: `Push sync failed (${phase}): ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  },
);
