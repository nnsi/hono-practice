import { describe, expect, it } from "vitest";

import { createV2InitialSync } from "./createV2InitialSync";
import {
  LAST_SYNCED_KEY,
  createDeps,
  okResponse,
} from "./v2InitialSyncTestHelpers";

const schedule = {
  id: "s1",
  recurrenceType: "interval",
  intervalDays: 2,
  memo: null,
};
describe("taskSchedules pull", () => {
  it("writes a pull containing only schedules and uses its server clock", async () => {
    const deps = createDeps();
    deps.api.getActivities.mockResolvedValue(okResponse({ activities: [] }));
    deps.api.getActivityLogs.mockResolvedValue(okResponse({ logs: [] }));
    deps.api.getTaskSchedules.mockResolvedValue({
      ...okResponse({ taskSchedules: [schedule] }),
      headers: new Headers({ date: "Tue, 31 Mar 2026 02:00:00 GMT" }),
    });
    await createV2InitialSync(deps).performInitialSync("u1");
    expect(
      deps.repos.taskSchedule.upsertTaskSchedulesFromServer,
    ).toHaveBeenCalledTimes(1);
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).toBe(
      "2026-03-31T01:59:59.000Z",
    );
  });
  it("writes schedule rows before Tasks with preserved schedule fields", async () => {
    const deps = createDeps();
    const order: string[] = [];
    deps.api.getTaskSchedules.mockResolvedValue(
      okResponse({ taskSchedules: [schedule] }),
    );
    deps.api.getTasks.mockResolvedValue(
      okResponse({
        tasks: [{ id: "t1", schedule_id: "s1", scheduled_date: "2026-09-10" }],
      }),
    );
    deps.repos.taskSchedule.upsertTaskSchedulesFromServer.mockImplementation(
      async () => {
        order.push("schedules");
      },
    );
    deps.repos.task.upsertTasksFromServer.mockImplementation(async () => {
      order.push("tasks");
    });
    await createV2InitialSync(deps).performInitialSync("u1");
    expect(order).toEqual(["schedules", "tasks"]);
    expect(deps.repos.task.upsertTasksFromServer).toHaveBeenCalledWith([
      expect.objectContaining({
        scheduleId: "s1",
        scheduledDate: "2026-09-10",
      }),
    ]);
  });
});
