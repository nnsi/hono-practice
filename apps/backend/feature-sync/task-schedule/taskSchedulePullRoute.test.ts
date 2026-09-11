import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { taskSchedules } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { makeSchedule, request, syncRequest } from "./testHelpers";

describe("task schedule incremental pull and clock skew", () => {
  test("since is strictly exclusive and includes tombstones", async () => {
    const schedule = makeSchedule();
    const time = new Date("2026-01-01T00:00:00.000Z");
    await testDB.insert(taskSchedules).values({
      id: schedule.id,
      userId: TEST_USER_ID,
      title: schedule.title,
      recurrenceType: "interval",
      intervalDays: 1,
      startDate: "2026-09-10",
      updatedAt: time,
      deletedAt: time,
    });
    const equal = await request(
      "GET",
      `/users/v2/task-schedules?since=${time.toISOString()}`,
    );
    expect(await equal.json()).toEqual({ taskSchedules: [] });
    const before = await request(
      "GET",
      `/users/v2/task-schedules?since=${new Date(time.getTime() - 1).toISOString()}`,
    );
    expect(await before.json()).toMatchObject({
      taskSchedules: [{ id: schedule.id, deletedAt: time.toISOString() }],
    });
    expect(
      (await request("GET", "/users/v2/task-schedules?since=2026-01-01"))
        .status,
    ).toBe(400);
    expect(
      (await request("GET", "/users/v2/task-schedules?since=invalid")).status,
    ).toBe(400);
  });
  test("slow clock insert and update become pullable from server time", async () => {
    const before = new Date(Date.now() - 1000).toISOString();
    const schedule = makeSchedule({ updatedAt: "2020-01-01T00:00:00.000Z" });
    expect((await syncRequest({ taskSchedules: [schedule] })).status).toBe(200);
    expect(
      await (
        await request("GET", `/users/v2/task-schedules?since=${before}`)
      ).json(),
    ).toMatchObject({ taskSchedules: [{ id: schedule.id }] });
    await testDB
      .update(taskSchedules)
      .set({ updatedAt: new Date("2020-01-01T00:00:00.000Z") })
      .where(eq(taskSchedules.id, schedule.id));
    const updated = {
      ...schedule,
      title: "更新",
      updatedAt: "2023-01-01T00:00:00.000Z",
    };
    expect(
      await (await syncRequest({ taskSchedules: [updated] })).json(),
    ).toMatchObject({ syncedIds: [schedule.id] });
    expect(
      await (
        await request("GET", `/users/v2/task-schedules?since=${before}`)
      ).json(),
    ).toMatchObject({ taskSchedules: [{ id: schedule.id, title: "更新" }] });
  });
  test("fast clock within five minutes is preserved", async () => {
    const updatedAt = new Date(Date.now() + 120000).toISOString();
    const schedule = makeSchedule({ updatedAt });
    expect(
      await (await syncRequest({ taskSchedules: [schedule] })).json(),
    ).toMatchObject({ syncedIds: [schedule.id], skippedIds: [] });
    expect(await (await request()).json()).toMatchObject({
      taskSchedules: [{ id: schedule.id, updatedAt }],
    });
  });
});
