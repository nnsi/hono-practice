import { testClient } from "hono/testing";

import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { taskSchedules, tasks } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import {
  activityId,
  createApp,
  request,
  scheduleBody,
  seedSchedule,
} from "./helpers";

describe("task schedule CRUD", () => {
  test("create, list and update both recurrence types", async () => {
    const res = await request("POST", undefined, {
      ...scheduleBody,
      activityId,
      activityKindId: activityId,
      quantity: 10,
      memo: "メモ",
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created).toMatchObject({
      activityId,
      activityKindId: activityId,
      quantity: 10,
      intervalDays: 2,
      weekdays: null,
      isActive: true,
    });
    const client = testClient(createApp(), { DB: testDB });
    const list = await client.users["task-schedules"].$get();
    expect(await list.json()).toMatchObject({
      taskSchedules: [{ id: created.id }],
    });
    const updated = await request(
      "PUT",
      `/users/task-schedules/${created.id}`,
      {
        recurrenceType: "weekdays",
        weekdays: [1, 3, 7],
        isActive: false,
        title: "曜日指定",
      },
    );
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      recurrenceType: "weekdays",
      intervalDays: null,
      weekdays: [1, 3, 7],
      isActive: false,
      memo: "メモ",
      activityId,
    });
    const reverted = await request(
      "PUT",
      `/users/task-schedules/${created.id}`,
      { recurrenceType: "interval", intervalDays: 3, endDate: "2026-09-30" },
    );
    expect(await reverted.json()).toMatchObject({
      intervalDays: 3,
      weekdays: null,
      endDate: "2026-09-30",
    });
  });
  test("soft delete retains completed task and exposes tombstone in DB", async () => {
    const schedule = await seedSchedule();
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
    expect(
      (await request("DELETE", `/users/task-schedules/${schedule.id}`)).status,
    ).toBe(200);
    expect(await (await request()).json()).toEqual({ taskSchedules: [] });
    const [persisted] = await testDB
      .select()
      .from(tasks)
      .where(eq(tasks.id, task.id));
    expect(persisted).toEqual(task);
    const [deleted] = await testDB
      .select()
      .from(taskSchedules)
      .where(eq(taskSchedules.id, schedule.id));
    expect(deleted.deletedAt).toBeInstanceOf(Date);
    expect(deleted.updatedAt.getTime()).toBeGreaterThanOrEqual(
      schedule.updatedAt.getTime(),
    );
    expect(
      (
        await request("PUT", `/users/task-schedules/${schedule.id}`, {
          title: "復活",
        })
      ).status,
    ).toBe(404);
  });
  test("pure TODO and clearing activity automatically clears kind", async () => {
    const res = await request("POST", undefined, {
      ...scheduleBody,
      activityId,
      activityKindId: activityId,
    });
    const created = await res.json();
    const cleared = await request(
      "PUT",
      `/users/task-schedules/${created.id}`,
      { activityId: null },
    );
    expect(await cleared.json()).toMatchObject({
      activityId: null,
      activityKindId: null,
    });
  });
});
