import { describe, expect, test } from "vitest";

import {
  activityId,
  otherActivityId,
  request,
  scheduleBody,
  seedOtherUser,
  seedSchedule,
} from "./helpers";

describe("task schedule validation and ownership", () => {
  test.each([
    { intervalDays: 0 },
    { intervalDays: 1.5 },
    { intervalDays: null },
    { recurrenceType: "weekdays", intervalDays: null, weekdays: [] },
    { recurrenceType: "weekdays", intervalDays: null, weekdays: [1, 1] },
    { recurrenceType: "weekdays", intervalDays: null, weekdays: [8] },
    { startDate: "2026-02-30" },
    { endDate: "2026-09-09" },
    { activityId: null, activityKindId: activityId },
    { activityId: otherActivityId, activityKindId: activityId },
  ])("rejects invalid create %j", async (body) => {
    expect(
      (await request("POST", undefined, { ...scheduleBody, ...body })).status,
    ).toBe(400);
  });
  test("validates merged partial updates", async () => {
    const schedule = await seedSchedule();
    const path = `/users/task-schedules/${schedule.id}`;
    expect((await request("PUT", path, { endDate: "2026-09-09" })).status).toBe(
      400,
    );
    expect(
      (await request("PUT", path, { recurrenceType: "weekdays" })).status,
    ).toBe(400);
    expect((await request("PUT", path, { intervalDays: null })).status).toBe(
      400,
    );
    expect((await request("PUT", path, { endDate: "2026-09-20" })).status).toBe(
      200,
    );
    expect(
      (await request("PUT", path, { startDate: "2026-09-21" })).status,
    ).toBe(400);
    expect((await request("PUT", path, { endDate: null })).status).toBe(200);
  });
  test("other users schedules and activities are isolated", async () => {
    const other = await seedOtherUser();
    expect(await (await request()).json()).toEqual({ taskSchedules: [] });
    expect(
      (
        await request("PUT", `/users/task-schedules/${other.scheduleId}`, {
          title: "変更",
        })
      ).status,
    ).toBe(404);
    expect(
      (await request("DELETE", `/users/task-schedules/${other.scheduleId}`))
        .status,
    ).toBe(404);
    expect(
      (
        await request("POST", undefined, {
          ...scheduleBody,
          activityId: other.activityId,
        })
      ).status,
    ).toBe(400);
    const schedule = await seedSchedule();
    expect(
      (
        await request("PUT", `/users/task-schedules/${schedule.id}`, {
          activityId: other.activityId,
        })
      ).status,
    ).toBe(400);
  });
  test("invalid ids and missing rows", async () => {
    for (const method of ["PUT", "DELETE"]) {
      expect(
        (await request(method, "/users/task-schedules/invalid", {})).status,
      ).toBe(400);
      expect(
        (
          await request(
            method,
            `/users/task-schedules/${crypto.randomUUID()}`,
            {},
          )
        ).status,
      ).toBe(404);
    }
  });
});
