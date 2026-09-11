import { describe, expect, it } from "vitest";

import { mapApiTask, mapApiTaskSchedule } from "./apiMappers";

const timestamp = "2026-09-10T00:00:00.000Z";
describe("mapApiTaskSchedule", () => {
  it("maps camelCase interval schedules and preserves nullable memo", () => {
    const row = {
      id: "s1",
      userId: "u1",
      activityId: null,
      activityKindId: null,
      quantity: null,
      title: "Read",
      memo: null,
      recurrenceType: "interval",
      intervalDays: 2,
      weekdays: null,
      startDate: "2026-09-10",
      endDate: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    expect(mapApiTaskSchedule(row)).toEqual(row);
  });
  it("maps snake_case weekdays and numeric quantity", () => {
    expect(
      mapApiTaskSchedule({
        id: "s2",
        user_id: "u1",
        activity_id: "a1",
        activity_kind_id: "k1",
        quantity: "5",
        title: "Train",
        memo: "memo",
        recurrence_type: "weekdays",
        interval_days: null,
        weekdays: [1, 3, 5],
        start_date: "2026-09-10",
        end_date: "2026-09-20",
        is_active: false,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: timestamp,
      }),
    ).toEqual({
      id: "s2",
      userId: "u1",
      activityId: "a1",
      activityKindId: "k1",
      quantity: 5,
      title: "Train",
      memo: "memo",
      recurrenceType: "weekdays",
      intervalDays: null,
      weekdays: [1, 3, 5],
      startDate: "2026-09-10",
      endDate: "2026-09-20",
      isActive: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: timestamp,
    });
  });
  it("rejects invalid recurrence instead of silently inventing a schedule", () => {
    expect(() =>
      mapApiTaskSchedule({
        id: "s1",
        recurrenceType: "interval",
        intervalDays: 0,
      }),
    ).toThrow();
  });
});
describe("Task schedule links", () => {
  it.each([
    { scheduleId: "s1", scheduledDate: "2026-09-10" },
    { schedule_id: "s1", scheduled_date: "2026-09-10" },
  ])("maps camel and snake fields", (fields) => {
    expect(mapApiTask({ id: "t1", ...fields })).toMatchObject({
      scheduleId: "s1",
      scheduledDate: "2026-09-10",
    });
  });
  it("normalizes missing legacy fields to null", () => {
    expect(mapApiTask({ id: "t1" })).toMatchObject({
      scheduleId: null,
      scheduledDate: null,
    });
  });
});
