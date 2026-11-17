import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDatabase } = vi.hoisted(() => ({ mockGetDatabase: vi.fn() }));
vi.mock("expo-sqlite", () => ({}));
vi.mock("../db/database", () => ({ getDatabase: mockGetDatabase }));
vi.mock("../db/dbEvents", () => ({
  dbEvents: { emit: vi.fn(), subscribe: vi.fn() },
}));

import {
  resetServerTimeForTests,
  trackServerTimestamps,
} from "@packages/sync-engine";

import { createSqliteTestDb } from "../db/sqliteTestHelpers";
import { activityLogRepository } from "./activityLogRepository";
import { goalFreezePeriodRepository } from "./goalFreezePeriodRepository";
import { goalRepository } from "./goalRepository";
import { noteRepository } from "./noteRepository";
import { taskRepository } from "./taskRepository";
import { taskScheduleRepository } from "./taskScheduleRepository";

const userId = "00000000-0000-4000-8000-000000000001";
const activityId = "00000000-0000-4000-8000-000000000002";
const goalId = "00000000-0000-4000-8000-000000000003";

type Row = { id: string; updatedAt: string; _syncStatus: string };
type Revision = { id: string; updatedAt: string };

type Case = {
  name: string;
  create: () => Promise<Row>;
  edit: (id: string) => Promise<void>;
  pending: () => Promise<Row[]>;
  markSynced: (revisions: Revision[]) => Promise<void>;
  markFailed: (revisions: Revision[]) => Promise<void>;
};

const cases: Case[] = [
  {
    name: "activity_logs",
    create: () =>
      activityLogRepository.createActivityLog({
        activityId,
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2026-11-17",
        time: null,
        taskId: null,
      }),
    edit: (id) => activityLogRepository.updateActivityLog(id, { quantity: 5 }),
    pending: () => activityLogRepository.getPendingSyncActivityLogs(),
    markSynced: (r) => activityLogRepository.markActivityLogsSynced(r),
    markFailed: (r) => activityLogRepository.markActivityLogsFailed(r),
  },
  {
    name: "goals",
    create: () =>
      goalRepository.createGoal({
        activityId,
        dailyTargetQuantity: 10,
        startDate: "2026-11-01",
      }),
    edit: (id) => goalRepository.updateGoal(id, { dailyTargetQuantity: 20 }),
    pending: () => goalRepository.getPendingSyncGoals(),
    markSynced: (r) => goalRepository.markGoalsSynced(r),
    markFailed: (r) => goalRepository.markGoalsFailed(r),
  },
  {
    name: "goal_freeze_periods",
    create: () =>
      goalFreezePeriodRepository.createGoalFreezePeriod({
        goalId,
        startDate: "2026-11-01",
      }),
    edit: (id) =>
      goalFreezePeriodRepository.updateGoalFreezePeriod(id, {
        endDate: "2026-11-30",
      }),
    pending: () => goalFreezePeriodRepository.getPendingSyncFreezePeriods(),
    markSynced: (r) => goalFreezePeriodRepository.markFreezePeriodsSynced(r),
    markFailed: (r) => goalFreezePeriodRepository.markFreezePeriodsFailed(r),
  },
  {
    name: "note",
    create: () => noteRepository.createNote({ title: "下書き" }),
    edit: (id) => noteRepository.updateNote(id, { title: "清書" }),
    pending: () => noteRepository.getPendingSyncNotes(),
    markSynced: (r) => noteRepository.markNotesSynced(r),
    markFailed: (r) => noteRepository.markNotesFailed(r),
  },
  {
    name: "tasks",
    create: () => taskRepository.createTask({ title: "タスク" }),
    edit: (id) => taskRepository.updateTask(id, { doneDate: "2026-11-17" }),
    pending: () => taskRepository.getPendingSyncTasks(),
    markSynced: (r) => taskRepository.markTasksSynced(r),
    markFailed: (r) => taskRepository.markTasksFailed(r),
  },
  {
    name: "task_schedules",
    create: () =>
      taskScheduleRepository.createTaskSchedule({
        title: "散歩",
        startDate: "2026-11-17",
        recurrenceType: "interval",
        intervalDays: 2,
      }),
    edit: (id) =>
      taskScheduleRepository.updateTaskSchedule(id, { title: "ランニング" }),
    pending: () => taskScheduleRepository.getPendingSyncTaskSchedules(),
    markSynced: (r) => taskScheduleRepository.markTaskSchedulesSynced(r),
    markFailed: (r) => taskScheduleRepository.markTaskSchedulesFailed(r),
  },
];

let db: ReturnType<typeof createSqliteTestDb>;

beforeEach(() => {
  vi.clearAllMocks();
  resetServerTimeForTests();
  db = createSqliteTestDb();
  mockGetDatabase.mockResolvedValue(db);
  db.sqlite
    .prepare(
      "INSERT INTO auth_state (id, user_id, last_login_at) VALUES ('current', ?, ?)",
    )
    .run(userId, "2026-11-17");
});

afterEach(() => {
  db.sqlite.close();
  resetServerTimeForTests();
});

describe.each(cases)("Mobile SQLite $name: push 応答の反映", (testCase) => {
  it("送信した版から変わっていない行だけ synced / failed にする", async () => {
    const created = await testCase.create();
    const sent = { id: created.id, updatedAt: created.updatedAt };

    await testCase.markFailed([sent]);
    expect((await testCase.pending())[0]?._syncStatus).toBe("failed");

    await testCase.markSynced([sent]);
    expect(await testCase.pending()).toEqual([]);
  });

  it("応答待ち中に編集された行は pending のまま、サーバーの保存時刻より後の updated_at になる", async () => {
    const created = await testCase.create();
    const sent = { id: created.id, updatedAt: created.updatedAt };
    await testCase.edit(created.id);

    // サーバーは受理した版の updatedAt を自分の時刻へ繰り上げて保存する
    const serverUpdatedAt = new Date(Date.now() + 5_000).toISOString();
    trackServerTimestamps([serverUpdatedAt]);
    await testCase.markSynced([sent]);

    const [local] = await testCase.pending();
    expect(local?._syncStatus).toBe("pending");
    expect(Date.parse(local.updatedAt)).toBeGreaterThan(
      Date.parse(serverUpdatedAt),
    );

    await testCase.markSynced([{ id: local.id, updatedAt: local.updatedAt }]);
    expect(await testCase.pending()).toEqual([]);
  });
});
