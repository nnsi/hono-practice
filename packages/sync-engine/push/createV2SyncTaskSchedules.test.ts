import { describe, expect, it } from "vitest";

import { createV2SyncFunctions } from "./createV2SyncFunctions";
import {
  createMockApi,
  createMockRepos,
  okSyncResult,
} from "./v2SyncTestHelpers";

const pendingSchedule = {
  id: "9f3c8bb0-0000-4000-8000-000000000001",
  title: "Walk",
  startDate: "2026-09-10",
  recurrenceType: "interval",
  intervalDays: 2,
  activityId: null,
  activityKindId: null,
  quantity: null,
  memo: null,
  endDate: null,
  weekdays: null,
  isActive: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
  deletedAt: null,
};

describe("V2 task schedule sync wiring", () => {
  it("posts schedules and dispatches all results to the schedule repository", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.taskSchedule.getPendingSyncTaskSchedules.mockResolvedValue([
      { ...pendingSchedule, _syncStatus: "pending" },
    ]);
    api.postTaskSchedules.mockResolvedValue(
      okSyncResult({
        syncedIds: ["s1"],
        skippedIds: ["s2"],
        serverWins: [{ id: "s3", recurrenceType: "weekdays", weekdays: [2] }],
      }),
    );
    await createV2SyncFunctions({ api, repos }).syncTaskSchedules();
    expect(api.postTaskSchedules).toHaveBeenCalledWith({
      taskSchedules: [pendingSchedule],
    });
    expect(repos.taskSchedule.markTaskSchedulesSynced).toHaveBeenCalledWith([
      "s1",
    ]);
    expect(repos.taskSchedule.markTaskSchedulesFailed).toHaveBeenCalledWith([
      "s2",
    ]);
    expect(
      repos.taskSchedule.upsertTaskSchedulesFromServer,
    ).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "s3",
          weekdays: [2],
          intervalDays: null,
        }),
      ],
      [pendingSchedule],
    );
  });
  it("preserves Task schedule fields in push and server wins", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    const task = { id: "t1", scheduleId: "s1", scheduledDate: "2026-09-10" };
    repos.task.getPendingSyncTasks.mockResolvedValue([
      { ...task, _syncStatus: "pending" },
    ]);
    api.postTasks.mockResolvedValue(
      okSyncResult({
        serverWins: [
          { id: "t1", schedule_id: "s1", scheduled_date: "2026-09-10" },
        ],
      }),
    );
    await createV2SyncFunctions({ api, repos }).syncTasks();
    expect(api.postTasks).toHaveBeenCalledWith({ tasks: [task] });
    expect(repos.task.upsertTasksFromServer).toHaveBeenCalledWith([
      expect.objectContaining(task),
    ]);
  });
  it("rejects non-ok schedule responses without marking rows", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.taskSchedule.getPendingSyncTaskSchedules.mockResolvedValue([
      { ...pendingSchedule, _syncStatus: "pending" },
    ]);
    api.postTaskSchedules.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      createV2SyncFunctions({ api, repos }).syncTaskSchedules(),
    ).rejects.toThrow("syncTaskSchedules failed: 500");
    expect(repos.taskSchedule.markTaskSchedulesSynced).not.toHaveBeenCalled();
  });
});
