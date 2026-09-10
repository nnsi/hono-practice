import { describe, expect, test } from "vitest";

import { isTaskScheduleDueOn } from "./isScheduleDueOn";
import { makeSchedule } from "./testFixtures";

describe("isTaskScheduleDueOn", () => {
  test.each([
    ["2026-09-08", false],
    ["2026-09-10", true],
    ["2026-09-11", false],
    ["2026-09-12", true],
    ["2026-09-14", true],
  ])("uses the fixed startDate origin: %s → %s", (date, expected) => {
    expect(isTaskScheduleDueOn(makeSchedule(), date)).toBe(expected);
  });

  test.each([
    ["2024-02-28", "2024-03-01", 2],
    ["2025-12-31", "2026-01-02", 2],
    ["2026-01-31", "2026-02-02", 2],
    ["2026-03-07", "2026-03-09", 2],
    ["2026-10-31", "2026-11-02", 2],
    ["2011-12-29", "2011-12-31", 2],
  ])("counts calendar days across %s → %s", (startDate, date, intervalDays) => {
    expect(
      isTaskScheduleDueOn(makeSchedule({ startDate, intervalDays }), date),
    ).toBe(true);
  });

  test("maps Monday to 1 and Sunday to 7", () => {
    const schedule = makeSchedule({
      recurrenceType: "weekdays",
      intervalDays: null,
      weekdays: [1, 7],
    });
    expect(isTaskScheduleDueOn(schedule, "2026-09-13")).toBe(true);
    expect(isTaskScheduleDueOn(schedule, "2026-09-14")).toBe(true);
    expect(isTaskScheduleDueOn(schedule, "2026-09-15")).toBe(false);
  });

  test("includes start/end boundaries and excludes inactive schedules", () => {
    const schedule = makeSchedule({ endDate: "2026-09-12" });
    expect(isTaskScheduleDueOn(schedule, "2026-09-10")).toBe(true);
    expect(isTaskScheduleDueOn(schedule, "2026-09-12")).toBe(true);
    expect(isTaskScheduleDueOn(schedule, "2026-09-13")).toBe(false);
    expect(isTaskScheduleDueOn(schedule, "2026-09-14")).toBe(false);
    expect(
      isTaskScheduleDueOn({ ...schedule, isActive: false }, "2026-09-10"),
    ).toBe(false);
  });

  test.each([
    null,
    0,
    -1,
    1.5,
  ])("ignores invalid interval %s", (intervalDays) => {
    expect(
      isTaskScheduleDueOn(makeSchedule({ intervalDays }), "2026-09-10"),
    ).toBe(false);
  });
});
