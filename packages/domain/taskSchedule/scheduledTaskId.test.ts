import { validate, version } from "uuid";
import { describe, expect, test } from "vitest";

import { createScheduledTaskId } from "./scheduledTaskId";
import { makeSchedule } from "./testFixtures";

describe("createScheduledTaskId", () => {
  test("returns the same UUID v5 for the same schedule and date", () => {
    const schedule = makeSchedule();
    const id = createScheduledTaskId(schedule.id, "2026-09-10");
    // Freeze the persisted identity contract across releases and platforms.
    expect(id).toBe("0ecd69d4-2418-56ff-a32f-e1754e6e6da7");
    expect(validate(id)).toBe(true);
    expect(version(id)).toBe(5);
    expect(createScheduledTaskId(schedule.id, "2026-09-10")).toBe(id);
  });

  test("changes when either schedule or date changes", () => {
    const id = makeSchedule().id;
    expect(
      new Set([
        createScheduledTaskId(id, "2026-09-10"),
        createScheduledTaskId(id, "2026-09-11"),
        createScheduledTaskId(
          "55555555-5555-4555-8555-555555555555",
          "2026-09-10",
        ),
      ]).size,
    ).toBe(3);
  });
});
