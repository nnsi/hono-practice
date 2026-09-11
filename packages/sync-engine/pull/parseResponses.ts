import { z } from "zod";

import { serverEntitySchema } from "../core/parseSyncResult";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiGoalFreezePeriod,
  mapApiNote,
  mapApiTask,
  mapApiTaskSchedule,
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
  taskSchedules: ReturnType<typeof mapApiTaskSchedule>[];
  tasks: ReturnType<typeof mapApiTask>[];
};

export async function parseResponses(
  activitiesRes: ApiResponse,
  logsRes: ApiResponse,
  goalsRes: ApiResponse,
  freezePeriodsRes: ApiResponse | null,
  tasksRes: ApiResponse,
  notesRes?: ApiResponse | null,
  taskSchedulesRes?: ApiResponse | null,
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
    taskSchedules: [],
  };
  const payloadSchema = z.record(z.string(), z.unknown());
  async function read(res: ApiResponse | null | undefined, key: string) {
    if (res == null) return [];
    if (!res.ok) {
      allSynced = false;
      return [];
    }
    const raw = payloadSchema.parse(await res.json());
    return serverEntitySchema.array().parse(raw[key] ?? []);
  }
  if (activitiesRes.ok) {
    const raw = payloadSchema.parse(await activitiesRes.json());
    data.activities = serverEntitySchema
      .array()
      .parse(raw.activities)
      .map(mapApiActivity);
    data.activityKinds = serverEntitySchema
      .array()
      .parse(raw.activityKinds ?? [])
      .map(mapApiActivityKind);
  } else {
    allSynced = false;
  }
  data.logs = (await read(logsRes, "logs")).map(mapApiActivityLog);
  data.goals = (await read(goalsRes, "goals")).map(mapApiGoal);
  data.freezePeriods = (await read(freezePeriodsRes, "freezePeriods")).map(
    mapApiGoalFreezePeriod,
  );
  data.tasks = (await read(tasksRes, "tasks")).map(mapApiTask);
  data.notes = (await read(notesRes, "notes")).map(mapApiNote);
  data.taskSchedules = (await read(taskSchedulesRes, "taskSchedules")).map(
    mapApiTaskSchedule,
  );
  return { allSynced, data };
}
