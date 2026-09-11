import { describe, expect, it } from "vitest";

import { createSyncTaskSchedules } from "./createSyncTaskSchedules";
import { createDeps, serverWin } from "./taskScheduleSyncTestHelpers";

describe("createSyncTaskSchedules", () => {
  it("skips empty pending rows", async () => {
    const deps = createDeps();
    await createSyncTaskSchedules(deps)();
    expect(deps.postChunk).not.toHaveBeenCalled();
  });
  it("strips status and handles synced, skipped and mapped server wins", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue([
      { id: "s1", _syncStatus: "pending", title: "Read" },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["s1"],
      skippedIds: ["s2"],
      serverWins: [serverWin],
    });
    await createSyncTaskSchedules(deps)();
    expect(deps.postChunk).toHaveBeenCalledWith([{ id: "s1", title: "Read" }]);
    expect(deps.markTaskSchedulesSynced).toHaveBeenCalledWith(["s1"]);
    expect(deps.markTaskSchedulesFailed).toHaveBeenCalledWith(["s2"]);
    expect(deps.upsertTaskSchedulesFromServer).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          recurrenceType: "interval",
          intervalDays: 2,
          memo: null,
        }),
      ],
      [{ id: "s1", title: "Read" }],
    );
  });
  it("chunks at 100 and applies each chunk's server wins", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        id: `s${i}`,
        _syncStatus: "pending",
      })),
    );
    deps.postChunk.mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [serverWin],
    });
    await createSyncTaskSchedules(deps)();
    expect(deps.postChunk.mock.calls.map(([rows]) => rows.length)).toEqual([
      100, 50,
    ]);
    expect(deps.upsertTaskSchedulesFromServer).toHaveBeenCalledTimes(2);
  });
  it("does not mark any rows when the first POST fails", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue([
      { id: "s1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockRejectedValue(new Error("offline"));
    await expect(createSyncTaskSchedules(deps)()).rejects.toThrow("offline");
    expect(deps.markTaskSchedulesSynced).not.toHaveBeenCalled();
  });
});
