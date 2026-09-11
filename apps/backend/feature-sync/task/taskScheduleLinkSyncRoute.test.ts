import { describe, expect, test } from "vitest";

import {
  request,
  seedOtherUser,
  seedSchedule,
} from "../../feature/taskSchedule/test/helpers";
import { request as syncRequest } from "../task-schedule/testHelpers";

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    title: "予定",
    activityId: null,
    activityKindId: null,
    quantity: null,
    memo: "",
    startDate: "2026-09-10",
    dueDate: null,
    doneDate: null,
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
function push(tasks: unknown[]) {
  return syncRequest("POST", "/users/v2/tasks/sync", { tasks });
}

describe("Task schedule sync fields", () => {
  test("insert/update/pull/serverWins include fields and allow deleted parent", async () => {
    const schedule = await seedSchedule();
    await request("DELETE", `/users/task-schedules/${schedule.id}`);
    const fields = { scheduleId: schedule.id, scheduledDate: "2026-09-10" };
    const task = makeTask(fields);
    expect(await (await push([task])).json()).toMatchObject({
      syncedIds: [task.id],
    });
    const pulled = await (await syncRequest("GET", "/users/v2/tasks")).json();
    expect(
      pulled.tasks.find((r: { id: string }) => r.id === task.id),
    ).toMatchObject(fields);
    const older = await push([
      { ...task, updatedAt: "2020-01-01T00:00:00.000Z" },
    ]);
    expect(await older.json()).toMatchObject({
      serverWins: [{ id: task.id, ...fields }],
    });
    const updated = {
      ...task,
      scheduledDate: "2026-09-11",
      updatedAt: new Date(Date.now() + 60000).toISOString(),
    };
    expect(await (await push([updated])).json()).toMatchObject({
      syncedIds: [task.id],
    });
    const final = await (await syncRequest("GET", "/users/v2/tasks")).json();
    expect(
      final.tasks.find((r: { id: string }) => r.id === task.id),
    ).toMatchObject({ ...fields, scheduledDate: "2026-09-11" });
  });
  test("missing fields accepted, foreign/missing parents skipped", async () => {
    const other = await seedOtherUser();
    const plain = makeTask();
    const invalid = [
      makeTask({ scheduleId: other.scheduleId }),
      makeTask({ scheduleId: crypto.randomUUID() }),
    ];
    const res = await push([plain, ...invalid]);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      syncedIds: [plain.id],
      skippedIds: invalid.map((r) => r.id),
    });
  });
});
