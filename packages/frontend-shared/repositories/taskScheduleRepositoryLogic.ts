import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import {
  type TaskScheduleRecord,
  getServerNowISOString,
} from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

type ScheduleData = Omit<
  TaskScheduleRecord,
  "id" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
>;
export type CreateTaskScheduleInput = Pick<
  ScheduleData,
  "title" | "startDate" | "recurrenceType"
> &
  Partial<ScheduleData>;
export type UpdateTaskScheduleInput = Partial<ScheduleData>;
export type TaskScheduleDbAdapter = {
  getUserId(): Promise<string>;
  insert(schedule: Syncable<TaskScheduleRecord>): Promise<void>;
  getAll(
    filter: (schedule: Syncable<TaskScheduleRecord>) => boolean,
  ): Promise<Syncable<TaskScheduleRecord>[]>;
  update(
    id: string,
    changes: Partial<Syncable<TaskScheduleRecord>>,
  ): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<TaskScheduleRecord>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(schedules: Syncable<TaskScheduleRecord>[]): Promise<void>;
};
export type TaskScheduleRepository = {
  createTaskSchedule(
    input: CreateTaskScheduleInput,
  ): Promise<Syncable<TaskScheduleRecord>>;
  updateTaskSchedule(
    id: string,
    changes: UpdateTaskScheduleInput,
  ): Promise<void>;
  softDeleteTaskSchedule(id: string): Promise<void>;
  getActiveTaskSchedules(): Promise<Syncable<TaskScheduleRecord>[]>;
  /** 未削除のスケジュールすべて（一時停止中を含む）。一覧・管理 UI 用 */
  getAllTaskSchedules(): Promise<Syncable<TaskScheduleRecord>[]>;
  getPendingSyncTaskSchedules(): Promise<Syncable<TaskScheduleRecord>[]>;
  markTaskSchedulesSynced(ids: string[]): Promise<void>;
  markTaskSchedulesFailed(ids: string[]): Promise<void>;
  upsertTaskSchedulesFromServer(
    schedules: TaskScheduleRecord[],
    sentSnapshots?: readonly { id: string; updatedAt: string }[],
  ): Promise<void>;
};

export function newTaskScheduleRepository(
  adapter: TaskScheduleDbAdapter,
  generateId: () => string = uuidv7,
): TaskScheduleRepository {
  return {
    async createTaskSchedule(input) {
      const data = taskScheduleDataSchema.parse(input);
      const now = getServerNowISOString();
      const schedule: Syncable<TaskScheduleRecord> = {
        ...data,
        id: generateId(),
        userId: await adapter.getUserId(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };
      await adapter.insert(schedule);
      return schedule;
    },
    async updateTaskSchedule(id, changes) {
      const [current] = await adapter.getByIds([id]);
      if (!current) return;
      const definedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );
      const recurrenceType = changes.recurrenceType ?? current.recurrenceType;
      const data = taskScheduleDataSchema.parse({
        ...current,
        ...definedChanges,
        ...(changes.activityId !== undefined &&
        changes.activityKindId === undefined
          ? { activityKindId: null }
          : {}),
        ...(recurrenceType !== current.recurrenceType
          ? recurrenceType === "interval"
            ? { weekdays: null }
            : { intervalDays: null }
          : {}),
      });
      await adapter.update(id, {
        ...data,
        updatedAt: getServerNowISOString(),
        _syncStatus: "pending",
      });
    },
    async softDeleteTaskSchedule(id) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },
    async getActiveTaskSchedules() {
      return adapter.getAll(
        (schedule) => !schedule.deletedAt && schedule.isActive,
      );
    },
    async getAllTaskSchedules() {
      return adapter.getAll((schedule) => !schedule.deletedAt);
    },
    async getPendingSyncTaskSchedules() {
      return adapter.getAll(
        (schedule) =>
          schedule._syncStatus === "pending" ||
          schedule._syncStatus === "failed",
      );
    },
    async markTaskSchedulesSynced(ids) {
      if (ids.length > 0) await adapter.updateSyncStatus(ids, "synced");
    },
    async markTaskSchedulesFailed(ids) {
      if (ids.length > 0) await adapter.updateSyncStatus(ids, "failed");
    },
    async upsertTaskSchedulesFromServer(schedules, sentSnapshots) {
      if (schedules.length === 0) return;
      const local = await adapter.getByIds(
        schedules.map((schedule) => schedule.id),
      );
      const pullSafe = new Set(
        filterSafeUpserts(schedules, local).map((row) => row.id),
      );
      const localById = new Map(local.map((row) => [row.id, row]));
      const sentById = new Map(
        sentSnapshots?.map((row) => [row.id, row.updatedAt]),
      );
      const safe = schedules.filter((row) => {
        const current = localById.get(row.id);
        const sentAt = sentById.get(row.id);
        // A server-wins response authoritatively resolves only the version sent.
        // Pulls still protect pending rows; edits made during the POST survive.
        if (current && sentAt !== undefined)
          return current.updatedAt === sentAt;
        return pullSafe.has(row.id);
      });
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map(
          (schedule): Syncable<TaskScheduleRecord> => ({
            ...schedule,
            _syncStatus: "synced",
          }),
        ),
      );
    },
  };
}
