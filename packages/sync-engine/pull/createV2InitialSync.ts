import type { DeltaSyncResource } from "./bootstrappedResources";
import { createInitialSync } from "./createInitialSync";
import type { V2InitialSyncDeps } from "./v2InitialSyncTypes";

const DELTA_SYNC_RESOURCES: readonly DeltaSyncResource[] = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
  "notes",
  "taskSchedules",
];

// Keep this list frozen. Future sync resources should be added only to
// DELTA_SYNC_RESOURCES so older clients full-pull the new resource once.
const LEGACY_BOOTSTRAPPED_RESOURCES: readonly DeltaSyncResource[] = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
];

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
      const taskSchedulesQuery = sinceByResource.taskSchedules
        ? { since: sinceByResource.taskSchedules }
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
        taskSchedulesRes,
        tasksRes,
        notesRes,
      ] = await Promise.all([
        deps.api.getActivities(),
        deps.api.getActivityLogs(logsQuery),
        deps.api.getGoals(goalsQuery),
        // Older backend deployments may still lack this endpoint during staged
        // rollout. Network failures fall back to null on both Web and Mobile.
        deps.api.getGoalFreezePeriods(freezePeriodsQuery).catch(() => null),
        deps.api.getTaskSchedules(taskSchedulesQuery).catch(() => null),
        deps.api.getTasks(tasksQuery),
        // Notes are best-effort during bootstrap: a failed fetch falls back to
        // null so other resources still hydrate and the watermark advances,
        // while the failed resource is dropped from bootstrappedResources and
        // re-pulled in full on the next sync (see createInitialSync).
        deps.api.getNotes(notesQuery).catch(() => null),
      ]);
      return {
        activitiesRes,
        logsRes,
        goalsRes,
        freezePeriodsRes,
        taskSchedulesRes,
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
        if (data.taskSchedules.length > 0) {
          await deps.repos.taskSchedule.upsertTaskSchedulesFromServer(
            data.taskSchedules,
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
