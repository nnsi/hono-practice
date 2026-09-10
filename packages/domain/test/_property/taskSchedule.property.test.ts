import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { describe, expect } from "vitest";

import {
  type TaskScheduleRecord,
  createScheduledTaskId,
  isTaskScheduleDueOn,
  resolveTodayScheduledTasks,
} from "../../taskSchedule";
import { scheduleDateArb, taskScheduleArb } from "./arbitraries";

dayjs.extend(utc);
const shift = (date: string, days: number) =>
  dayjs.utc(date).add(days, "day").format("YYYY-MM-DD");
const resolve = resolveTodayScheduledTasks;
const schedulesArb = fc.uniqueArray(taskScheduleArb, {
  selector: (schedule) => schedule.id,
  maxLength: 15,
});
const weekdaysArb = fc.uniqueArray(fc.integer({ min: 1, max: 7 }), {
  minLength: 1,
  maxLength: 7,
});
const intervalArb = fc.integer({ min: 1, max: 60 });
const offsetArb = fc.integer({ min: -400, max: 800 });
const statusArb = fc.record({
  done: fc.boolean(),
  deleted: fc.boolean(),
  archived: fc.boolean(),
});
function daily(
  seed: TaskScheduleRecord,
  startDate: string,
): TaskScheduleRecord {
  return {
    ...seed,
    startDate,
    endDate: null,
    isActive: true,
    deletedAt: null,
    intervalDays: seed.recurrenceType === "interval" ? 1 : null,
    weekdays: seed.recurrenceType === "weekdays" ? [1, 2, 3, 4, 5, 6, 7] : null,
  };
}

describe("Task Schedule property", () => {
  test.prop([fc.uuid(), scheduleDateArb, fc.uuid(), scheduleDateArb])(
    "ID is deterministic and distinguishes schedule/date pairs",
    (id, date, otherId, otherDate) => {
      const result = createScheduledTaskId(id, date);
      expect(createScheduledTaskId(id, date)).toBe(result);
      expect(createScheduledTaskId(id, shift(date, 1))).not.toBe(result);
      if (id !== otherId || date !== otherDate) {
        expect(createScheduledTaskId(otherId, otherDate)).not.toBe(result);
      }
    },
  );

  test.prop([schedulesArb, scheduleDateArb, taskScheduleArb])(
    "output is deterministic, only today, ordered, pure and idempotent",
    (schedules, today, seed) => {
      // Always include a due row to avoid vacuously passing on empty output.
      const input = {
        schedules: [
          ...schedules.filter((s) => s.id !== seed.id),
          daily(seed, today),
        ],
        tasksOnDate: [],
        today,
      };
      const before = structuredClone(input);
      const result = resolve(input);
      expect(result.length).toBeGreaterThan(0);
      expect(resolve(input)).toEqual(result);
      const reversed = [...input.schedules].reverse();
      expect(resolve({ ...input, schedules: reversed })).toEqual(result);
      expect(input).toEqual(before);
      for (const task of result) {
        expect(task.scheduledDate).toBe(today);
        expect(task.startDate).toBe(today);
        expect(task.dueDate).toBe(today);
        expect(task.id).toBe(createScheduledTaskId(task.scheduleId, today));
      }
      const times = result.map((task) => Date.parse(task.createdAt));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(resolve({ ...input, tasksOnDate: result })).toEqual([]);
    },
  );

  test.prop([taskScheduleArb, scheduleDateArb, statusArb])(
    "existing tasks suppress schedules regardless of done/deleted/archived status",
    (seed, today, { done, deleted, archived }) => {
      const schedules = [daily(seed, today)];
      const input = { schedules, tasksOnDate: [], today };
      const [task] = resolve(input);
      expect(task).toBeDefined();
      const tasksOnDate = [
        {
          ...task,
          doneDate: done ? today : null,
          deletedAt: deleted ? `${today}T00:00:00Z` : null,
          archivedAt: archived ? `${today}T00:00:00Z` : null,
        },
      ];
      expect(resolve({ ...input, tasksOnDate })).toEqual([]);
    },
  );

  test.prop([taskScheduleArb, scheduleDateArb, intervalArb, offsetArb])(
    "interval matches calendar-day multiples across month/year/leap boundaries",
    (seed, startDate, intervalDays, offset) => {
      const schedule: TaskScheduleRecord = {
        ...daily(seed, startDate),
        recurrenceType: "interval",
        intervalDays,
        weekdays: null,
      };
      const today = shift(startDate, offset);
      const result = resolve({ schedules: [schedule], tasksOnDate: [], today });
      const expected = offset >= 0 && offset % intervalDays === 0;
      expect(isTaskScheduleDueOn(schedule, today)).toBe(expected);
      expect(result).toHaveLength(expected ? 1 : 0);
      for (const task of result) {
        const days =
          (Date.parse(task.scheduledDate) - Date.parse(startDate)) / 86400000;
        expect(days % intervalDays).toBe(0);
      }
      const nextDue = shift(startDate, intervalDays * Math.abs(offset));
      expect(isTaskScheduleDueOn(schedule, nextDue)).toBe(true);
    },
  );

  test.prop([taskScheduleArb, scheduleDateArb, weekdaysArb])(
    "weekdays output exactly matches today's ISO weekday",
    (seed, today, weekdays) => {
      const schedule: TaskScheduleRecord = {
        ...daily(seed, shift(today, -7)),
        recurrenceType: "weekdays",
        intervalDays: null,
        weekdays,
      };
      const isoWeekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7;
      const result = resolve({ schedules: [schedule], tasksOnDate: [], today });
      const expected = weekdays.includes(isoWeekday);
      expect(isTaskScheduleDueOn(schedule, today)).toBe(expected);
      expect(result).toHaveLength(expected ? 1 : 0);
    },
  );

  test.prop([taskScheduleArb, scheduleDateArb, intervalArb])(
    "start/end inclusive; before start, after end, inactive and deleted excluded",
    (seed, startDate, span) => {
      const endDate = shift(startDate, span);
      const schedule = { ...daily(seed, startDate), endDate };
      for (const date of [startDate, endDate]) {
        expect(isTaskScheduleDueOn(schedule, date)).toBe(true);
        const inactive = { ...schedule, isActive: false };
        expect(isTaskScheduleDueOn(inactive, date)).toBe(false);
        const deleted = { ...schedule, deletedAt: `${date}T00:00:00Z` };
        const schedules = [inactive, deleted];
        expect(resolve({ schedules, tasksOnDate: [], today: date })).toEqual(
          [],
        );
      }
      expect(isTaskScheduleDueOn(schedule, shift(startDate, -1))).toBe(false);
      expect(isTaskScheduleDueOn(schedule, shift(endDate, 1))).toBe(false);
    },
  );
});
