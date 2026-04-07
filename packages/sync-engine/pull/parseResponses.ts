import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiGoalFreezePeriod,
  mapApiNote,
  mapApiTask,
} from "../mappers/apiMappers";

export type ApiResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
  headers?: { get(name: string): string | null };
};

export type ParsedSyncData = {
  activities: ReturnType<typeof mapApiActivity>[];
  activityKinds: ReturnType<typeof mapApiActivityKind>[];
  logs: ReturnType<typeof mapApiActivityLog>[];
  goals: ReturnType<typeof mapApiGoal>[];
  freezePeriods: ReturnType<typeof mapApiGoalFreezePeriod>[];
  notes: ReturnType<typeof mapApiNote>[];
  tasks: ReturnType<typeof mapApiTask>[];
};

export async function parseResponses(
  activitiesRes: ApiResponse,
  logsRes: ApiResponse,
  goalsRes: ApiResponse,
  freezePeriodsRes: ApiResponse | null,
  tasksRes: ApiResponse,
  notesRes?: ApiResponse | null,
): Promise<{ allSynced: boolean; data: ParsedSyncData }> {
  let allSynced = true;
  const data: ParsedSyncData = {
    activities: [],
    activityKinds: [],
    logs: [],
    goals: [],
    freezePeriods: [],
    notes: [],
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

  if (notesRes?.ok) {
    const raw = (await notesRes.json()) as {
      notes?: (Record<string, unknown> & { id: string })[];
    };
    if (raw.notes && raw.notes.length > 0) {
      data.notes = raw.notes.map(mapApiNote);
    }
  } else if (notesRes === null || (notesRes !== undefined && !notesRes?.ok)) {
    allSynced = false;
  }

  return { allSynced, data };
}
