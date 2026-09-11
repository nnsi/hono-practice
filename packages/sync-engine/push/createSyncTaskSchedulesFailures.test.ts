import { describe, expect, it } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncTaskSchedules } from "./createSyncTaskSchedules";
import { createDeps, serverWin } from "./taskScheduleSyncTestHelpers";

describe("createSyncTaskSchedules", () => {
  it("keeps successful first chunk writes when the second POST fails", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue(
      Array.from({ length: 101 }, (_, i) => ({
        id: `s${i}`,
        _syncStatus: "failed",
      })),
    );
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: ["s0"],
        skippedIds: [],
        serverWins: [],
      })
      .mockRejectedValueOnce(new Error("offline"));
    await expect(createSyncTaskSchedules(deps)()).rejects.toThrow("offline");
    expect(deps.markTaskSchedulesSynced).toHaveBeenCalledExactlyOnceWith([
      "s0",
    ]);
  });
  it("aborts writes if generation changes after posting", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue([
      { id: "s1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return { syncedIds: ["s1"], skippedIds: [], serverWins: [serverWin] };
    });
    await createSyncTaskSchedules(deps)();
    expect(deps.markTaskSchedulesSynced).not.toHaveBeenCalled();
    expect(deps.upsertTaskSchedulesFromServer).not.toHaveBeenCalled();
  });
  it("aborts remaining writes and chunks if generation changes during marking", async () => {
    const deps = createDeps();
    deps.getPendingSyncTaskSchedules.mockResolvedValue(
      Array.from({ length: 101 }, (_, i) => ({
        id: `s${i}`,
        _syncStatus: "pending",
      })),
    );
    deps.markTaskSchedulesSynced.mockImplementation(async () => {
      invalidateSync();
    });
    await createSyncTaskSchedules(deps)();
    expect(deps.markTaskSchedulesFailed).not.toHaveBeenCalled();
    expect(deps.postChunk).toHaveBeenCalledTimes(1);
  });
});
