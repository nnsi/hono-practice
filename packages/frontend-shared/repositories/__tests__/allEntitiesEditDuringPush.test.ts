import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import {
  type TaskScheduleRecord,
  createV2SyncFunctions,
  resetServerTimeForTests,
} from "@packages/sync-engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newActivityLogRepository } from "../activityLogRepositoryLogic";
import { newGoalFreezePeriodRepository } from "../goalFreezePeriodRepositoryLogic";
import { newGoalRepository } from "../goalRepositoryLogic";
import { newNoteRepository } from "../noteRepositoryLogic";
import { newTaskRepository } from "../taskRepositoryLogic";
import { newTaskScheduleRepository } from "../taskScheduleRepositoryLogic";
import {
  createFakeSyncServer,
  createInMemoryAdapter,
  createManualNetwork,
  settle,
} from "./syncRaceTestHelpers";

const BASE = Date.parse("2026-11-17T08:00:14.900Z");
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ACTIVITY_ID = "00000000-0000-4000-8000-000000000002";
const GOAL_ID = "00000000-0000-4000-8000-000000000003";

type Row = { id: string; updatedAt: string };

/** Web / Mobile の syncEngine と同じ配線（createV2SyncFunctions）を組む */
function setup() {
  const logs = createInMemoryAdapter<Omit<ActivityLogRecord, "userId">>();
  const goals = createInMemoryAdapter<GoalRecord>(USER_ID);
  const tasks = createInMemoryAdapter<TaskRecord>(USER_ID);
  const notes = createInMemoryAdapter<NoteRecord>(USER_ID);
  const freezePeriods = createInMemoryAdapter<GoalFreezePeriodRecord>(USER_ID);
  const schedules = createInMemoryAdapter<TaskScheduleRecord>(USER_ID);

  const repos = {
    activityLog: newActivityLogRepository(logs.adapter),
    goal: newGoalRepository(goals.adapter),
    task: newTaskRepository(tasks.adapter),
    note: newNoteRepository(notes.adapter),
    goalFreezePeriod: newGoalFreezePeriodRepository(freezePeriods.adapter),
    taskSchedule: newTaskScheduleRepository(schedules.adapter),
  };

  const server = createFakeSyncServer<Row>(() => Date.now());
  const network = createManualNetwork((chunk: Row[]) => ({
    ok: true,
    status: 200,
    json: async (): Promise<unknown> => server.push(chunk),
  }));
  const fns = createV2SyncFunctions({
    api: {
      postActivityLogs: ({ logs: chunk }) => network.send(chunk),
      postGoals: ({ goals: chunk }) => network.send(chunk),
      postTasks: ({ tasks: chunk }) => network.send(chunk),
      postNotes: ({ notes: chunk }) => network.send(chunk),
      postGoalFreezePeriods: ({ freezePeriods: chunk }) => network.send(chunk),
      postTaskSchedules: ({ taskSchedules: chunk }) => network.send(chunk),
    },
    repos,
  });

  return { repos, fns, server, network };
}

type Context = ReturnType<typeof setup>;

type Case = {
  name: string;
  sync: (ctx: Context) => () => Promise<void>;
  create: (ctx: Context) => Promise<Row>;
  edit: (ctx: Context, id: string) => Promise<void>;
  local: (
    ctx: Context,
    id: string,
  ) => Promise<(Row & { _syncStatus: string }) | undefined>;
  /** 編集がサーバーへ届いたことを確かめる値 */
  edited: Record<string, unknown>;
};

const cases: Case[] = [
  {
    name: "activity log",
    sync: ({ fns }) => fns.syncActivityLogs,
    create: ({ repos }) =>
      repos.activityLog.createActivityLog({
        activityId: ACTIVITY_ID,
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2026-11-17",
        time: null,
        taskId: null,
      }),
    edit: ({ repos }, id) =>
      repos.activityLog.updateActivityLog(id, { quantity: 5 }),
    local: async ({ repos }, id) =>
      (await repos.activityLog.getActivityLogsByDate("2026-11-17")).find(
        (row) => row.id === id,
      ),
    edited: { quantity: 5 },
  },
  {
    name: "goal",
    sync: ({ fns }) => fns.syncGoals,
    create: ({ repos }) =>
      repos.goal.createGoal({
        activityId: ACTIVITY_ID,
        dailyTargetQuantity: 10,
        startDate: "2026-11-01",
      }),
    edit: ({ repos }, id) =>
      repos.goal.updateGoal(id, { dailyTargetQuantity: 20 }),
    local: async ({ repos }, id) =>
      (await repos.goal.getAllGoals()).find((row) => row.id === id),
    edited: { dailyTargetQuantity: 20 },
  },
  {
    name: "goal freeze period",
    sync: ({ fns }) => fns.syncGoalFreezePeriods,
    create: ({ repos }) =>
      repos.goalFreezePeriod.createGoalFreezePeriod({
        goalId: GOAL_ID,
        startDate: "2026-11-01",
      }),
    edit: ({ repos }, id) =>
      repos.goalFreezePeriod.updateGoalFreezePeriod(id, {
        endDate: "2026-11-30",
      }),
    local: async ({ repos }, id) =>
      (await repos.goalFreezePeriod.getFreezePeriodsByGoalId(GOAL_ID)).find(
        (row) => row.id === id,
      ),
    edited: { endDate: "2026-11-30" },
  },
  {
    name: "note",
    sync: ({ fns }) => fns.syncNotes,
    create: ({ repos }) => repos.note.createNote({ title: "下書き" }),
    edit: ({ repos }, id) => repos.note.updateNote(id, { title: "清書" }),
    local: ({ repos }, id) => repos.note.getNoteById(id),
    edited: { title: "清書" },
  },
  {
    name: "task",
    sync: ({ fns }) => fns.syncTasks,
    create: ({ repos }) => repos.task.createTask({ title: "タスク" }),
    edit: ({ repos }, id) =>
      repos.task.updateTask(id, { doneDate: "2026-11-17" }),
    local: async ({ repos }, id) =>
      (await repos.task.getAllActiveTasks()).find((row) => row.id === id),
    edited: { doneDate: "2026-11-17" },
  },
  {
    name: "task schedule",
    sync: ({ fns }) => fns.syncTaskSchedules,
    create: ({ repos }) =>
      repos.taskSchedule.createTaskSchedule({
        title: "散歩",
        startDate: "2026-11-17",
        recurrenceType: "interval",
        intervalDays: 2,
      }),
    edit: ({ repos }, id) =>
      repos.taskSchedule.updateTaskSchedule(id, { title: "ランニング" }),
    local: async ({ repos }, id) =>
      (await repos.taskSchedule.getAllTaskSchedules()).find(
        (row) => row.id === id,
      ),
    edited: { title: "ランニング" },
  },
];

describe.each(cases)("$name の同期: push 前後の編集", (testCase) => {
  beforeEach(() => {
    resetServerTimeForTests();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(BASE);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetServerTimeForTests();
  });

  async function syncToCompletion(ctx: Context) {
    const done = testCase.sync(ctx)();
    await ctx.network.deliverAll();
    await done;
  }

  it("端末の時計がサーバーより遅れていても、同期完了直後の編集がサーバーに届く", async () => {
    const ctx = setup();
    const created = await testCase.create(ctx);
    // サーバーの時計は端末より 3 秒進んでいる
    vi.setSystemTime(BASE + 3_000);
    await syncToCompletion(ctx);

    vi.setSystemTime(BASE + 150);
    await testCase.edit(ctx, created.id);
    vi.setSystemTime(BASE + 3_150);
    await syncToCompletion(ctx);

    expect(ctx.server.get(created.id)).toMatchObject(testCase.edited);
    expect(await testCase.local(ctx, created.id)).toMatchObject({
      ...testCase.edited,
      _syncStatus: "synced",
    });
  });

  it("push の応答待ち中に編集した行は synced にならず、次の同期でサーバーに届く", async () => {
    const ctx = setup();
    const created = await testCase.create(ctx);
    const inFlight = testCase.sync(ctx)();
    await settle();
    expect(ctx.network.inFlight()).toBe(1);

    vi.setSystemTime(BASE + 30);
    await testCase.edit(ctx, created.id);

    vi.setSystemTime(BASE + 400);
    await ctx.network.deliverAll();
    await inFlight;

    expect(await testCase.local(ctx, created.id)).toMatchObject({
      ...testCase.edited,
      _syncStatus: "pending",
    });

    await syncToCompletion(ctx);

    expect(ctx.server.get(created.id)).toMatchObject(testCase.edited);
    expect(await testCase.local(ctx, created.id)).toMatchObject({
      ...testCase.edited,
      _syncStatus: "synced",
    });
  });
});
