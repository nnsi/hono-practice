import { describe, expect, test } from "vitest";

import { createUserId } from "../user/userSchema";
import {
  TaskScheduleSchema,
  createTaskScheduleEntity,
  createTaskScheduleId,
  taskScheduleDataSchema,
} from ".";

const base = {
  title: "筋トレ",
  startDate: "2026-09-10",
  recurrenceType: "interval",
  intervalDays: 2,
};
describe("task schedule validation", () => {
  test("interval and weekdays, inclusive dates and defaults", () => {
    expect(taskScheduleDataSchema.parse(base)).toMatchObject({
      intervalDays: 2,
      weekdays: null,
      isActive: true,
      endDate: null,
    });
    expect(
      taskScheduleDataSchema.parse({
        ...base,
        recurrenceType: "weekdays",
        intervalDays: null,
        weekdays: [1, 7],
        endDate: base.startDate,
      }),
    ).toMatchObject({ weekdays: [1, 7] });
  });
  test.each([
    { intervalDays: 0 },
    { intervalDays: -1 },
    { intervalDays: 1.5 },
    { intervalDays: null },
    { recurrenceType: "daily" },
    { weekdays: [1] },
    { startDate: "2026-02-30" },
    { endDate: "2026-09-09" },
    ...[[], [0], [8], [1.5], [1, 1]].map((weekdays) => ({
      recurrenceType: "weekdays",
      intervalDays: null,
      weekdays,
    })),
    { recurrenceType: "weekdays", intervalDays: null },
  ])("rejects invalid rule %j", (changes) => {
    expect(
      taskScheduleDataSchema.safeParse({ ...base, ...changes }).success,
    ).toBe(false);
  });
  test("branded id and new/persisted entity", () => {
    const id = createTaskScheduleId();
    const userId = createUserId();
    const entity = createTaskScheduleEntity({
      ...taskScheduleDataSchema.parse(base),
      id,
      userId,
      type: "new",
    });
    expect(entity.type).toBe("new");
    expect(
      TaskScheduleSchema.safeParse({ ...entity, type: "persisted" }).success,
    ).toBe(false);
    expect(
      createTaskScheduleEntity({
        ...entity,
        type: "persisted",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).type,
    ).toBe("persisted");
    expect(() => createTaskScheduleId("invalid")).toThrow();
  });
});
