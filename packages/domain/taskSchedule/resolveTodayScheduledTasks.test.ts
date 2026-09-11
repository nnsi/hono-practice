import { describe, expect, test } from "vitest";

import type { TaskItem } from "../task/types";
import { resolveTodayScheduledTasks } from "./resolveTodayScheduledTasks";
import { createScheduledTaskId } from "./scheduledTaskId";
import { makeSchedule } from "./testFixtures";

const today = "2026-09-10";

describe("resolveTodayScheduledTasks", () => {
  test("copies schedule fields into a TaskItem-compatible virtual task", () => {
    const schedule = makeSchedule();
    const tasks: TaskItem[] = resolveTodayScheduledTasks({
      schedules: [schedule],
      tasksOnDate: [],
      today,
    });
    expect(tasks).toEqual([
      {
        id: createScheduledTaskId(schedule.id, today),
        userId: schedule.userId,
        activityId: schedule.activityId,
        activityKindId: schedule.activityKindId,
        quantity: 10,
        title: "筋トレ",
        memo: "3セット",
        startDate: today,
        dueDate: today,
        scheduledDate: today,
        doneDate: null,
        scheduleId: schedule.id,
        archivedAt: null,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        isVirtual: true,
      },
    ]);
  });

  test("supports TODO schedules and normalizes nullable memo", () => {
    const tasks = resolveTodayScheduledTasks({
      schedules: [
        makeSchedule({
          activityId: null,
          activityKindId: null,
          quantity: null,
          memo: null,
        }),
      ],
      tasksOnDate: [],
      today,
    });
    expect(tasks[0]).toMatchObject({
      activityId: null,
      activityKindId: null,
      quantity: null,
      memo: "",
    });
  });

  test("suppresses existing rows in all completed/deleted/archived states", () => {
    const schedules = [makeSchedule()];
    const [task] = resolveTodayScheduledTasks({
      schedules,
      tasksOnDate: [],
      today,
    });
    for (const doneDate of [null, today]) {
      for (const deletedAt of [null, "2026-09-10T00:00:00Z"]) {
        for (const archivedAt of [null, "2026-09-10T00:00:00Z"]) {
          const tasksOnDate = [{ ...task, doneDate, deletedAt, archivedAt }];
          expect(
            resolveTodayScheduledTasks({ schedules, tasksOnDate, today }),
          ).toEqual([]);
        }
      }
    }
  });

  test("ignores other dates and unrelated/legacy tasks", () => {
    const schedule = makeSchedule();
    const tasksOnDate = [
      { scheduleId: schedule.id, scheduledDate: "2026-09-08" },
      { scheduleId: "other", scheduledDate: today },
      { scheduleId: null, scheduledDate: null },
      {},
    ];
    expect(
      resolveTodayScheduledTasks({ schedules: [schedule], tasksOnDate, today }),
    ).toHaveLength(1);
  });

  test("excludes deleted, inactive, future and non-due schedules", () => {
    const schedules = [
      makeSchedule({ deletedAt: "2026-09-09T00:00:00Z" }),
      makeSchedule({ isActive: false }),
      makeSchedule({ startDate: "2026-09-11" }),
      makeSchedule({ startDate: "2026-09-09" }),
      makeSchedule({ endDate: "2026-09-09" }),
    ];
    expect(
      resolveTodayScheduledTasks({ schedules, tasksOnDate: [], today }),
    ).toEqual([]);
    expect(
      resolveTodayScheduledTasks({ schedules: [], tasksOnDate: [], today }),
    ).toEqual([]);
  });

  test("sorts by creation instant then id without mutating input", () => {
    const schedules = Object.freeze([
      Object.freeze(
        makeSchedule({ id: "c", createdAt: "2026-09-01T01:00:00Z" }),
      ),
      Object.freeze(makeSchedule({ id: "b" })),
      Object.freeze(
        makeSchedule({ id: "a", createdAt: "2026-09-01T09:00:00+09:00" }),
      ),
    ]);
    const input = { schedules, tasksOnDate: Object.freeze([]), today };
    const output = resolveTodayScheduledTasks(input);
    expect(output.map((task) => task.scheduleId)).toEqual(["a", "b", "c"]);
    expect(resolveTodayScheduledTasks(input)).toEqual(output);
    expect(
      resolveTodayScheduledTasks({
        ...input,
        schedules: [...schedules].reverse(),
      }),
    ).toEqual(output);
    expect(
      resolveTodayScheduledTasks({ ...input, tasksOnDate: output }),
    ).toEqual([]);
  });
});
