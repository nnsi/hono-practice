import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { taskSchedules, tasks } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import {
  activityId,
  otherActivityId,
  seedOtherUser,
} from "../../feature/taskSchedule/test/helpers";
import { makeSchedule, request, syncRequest } from "./testHelpers";

describe("task schedule sync", () => {
  test("insert, update all fields, tombstone and retain completed task", async () => {
    const schedule = makeSchedule();
    const res = await syncRequest({ taskSchedules: [schedule] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      syncedIds: [schedule.id],
      serverWins: [],
      skippedIds: [],
    });
    const [task] = await testDB
      .insert(tasks)
      .values({
        userId: TEST_USER_ID,
        title: "完了",
        doneDate: "2026-09-10",
        scheduleId: schedule.id,
        scheduledDate: "2026-09-10",
      })
      .returning();
    const updatedAt = new Date(Date.now() + 60000).toISOString();
    const updated = {
      ...schedule,
      recurrenceType: "weekdays",
      intervalDays: null,
      weekdays: [1, 7],
      title: "変更",
      memo: "メモ",
      activityId,
      activityKindId: activityId,
      quantity: 12.5,
      isActive: false,
      startDate: "2026-09-11",
      endDate: "2026-09-30",
      updatedAt,
      deletedAt: updatedAt,
    };
    expect((await syncRequest({ taskSchedules: [updated] })).status).toBe(200);
    const pulled = await (await request()).json();
    expect(pulled.taskSchedules).toHaveLength(1);
    expect(pulled.taskSchedules[0]).toMatchObject(updated);
    const [remaining] = await testDB
      .select()
      .from(tasks)
      .where(eq(tasks.id, task.id));
    expect(remaining).toEqual(task);
  });
  test("older and equal updates return serverWins, newer update wins", async () => {
    const schedule = makeSchedule();
    await syncRequest({ taskSchedules: [schedule] });
    const [server] = await testDB
      .select()
      .from(taskSchedules)
      .where(eq(taskSchedules.id, schedule.id));
    for (const updatedAt of [
      "2020-01-01T00:00:00.000Z",
      server.updatedAt.toISOString(),
    ]) {
      const res = await syncRequest({
        taskSchedules: [{ ...schedule, title: "古い", updatedAt }],
      });
      expect(await res.json()).toMatchObject({
        syncedIds: [],
        serverWins: [{ id: schedule.id, title: schedule.title }],
        skippedIds: [],
      });
    }
  });
  test("cross-user ids, foreign activities, mismatched kinds and future clocks are skipped", async () => {
    const other = await seedOtherUser();
    const rows = [
      makeSchedule({ id: other.scheduleId }),
      makeSchedule({ activityId: other.activityId }),
      makeSchedule({ activityId: otherActivityId, activityKindId: activityId }),
      makeSchedule({ activityKindId: activityId }),
      makeSchedule({ updatedAt: new Date(Date.now() + 600000).toISOString() }),
    ];
    const valid = makeSchedule({ activityId, activityKindId: activityId });
    const res = await syncRequest({ taskSchedules: [...rows, valid] });
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.syncedIds).toEqual([valid.id]);
    expect(result.serverWins).toEqual([]);
    expect(result.skippedIds.sort()).toEqual(rows.map((r) => r.id).sort());
    const pulled = await (await request()).json();
    expect(pulled.taskSchedules.map((r: { id: string }) => r.id)).toEqual([
      valid.id,
    ]);
  });
  test("empty batch and malformed payloads", async () => {
    expect(await (await syncRequest({ taskSchedules: [] })).json()).toEqual({
      syncedIds: [],
      serverWins: [],
      skippedIds: [],
    });
    const duplicate = makeSchedule();
    for (const body of [
      {},
      { taskSchedules: [makeSchedule({ intervalDays: 0 })] },
      {
        taskSchedules: [
          makeSchedule({
            recurrenceType: "weekdays",
            intervalDays: null,
            weekdays: [1, 1],
          }),
        ],
      },
      { taskSchedules: [makeSchedule({ endDate: "2026-09-09" })] },
      { taskSchedules: [duplicate, duplicate] },
      { taskSchedules: Array.from({ length: 101 }, () => makeSchedule()) },
    ]) {
      expect((await syncRequest(body)).status).toBe(400);
    }
  });
});
