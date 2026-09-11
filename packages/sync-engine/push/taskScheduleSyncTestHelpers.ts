import { vi } from "vitest";

export function createDeps() {
  return {
    getPendingSyncTaskSchedules: vi.fn().mockResolvedValue([]),
    postChunk: vi
      .fn()
      .mockResolvedValue({ syncedIds: [], skippedIds: [], serverWins: [] }),
    markTaskSchedulesSynced: vi.fn().mockResolvedValue(undefined),
    markTaskSchedulesFailed: vi.fn().mockResolvedValue(undefined),
    upsertTaskSchedulesFromServer: vi.fn().mockResolvedValue(undefined),
  };
}
export const serverWin = {
  id: "s1",
  recurrence_type: "interval",
  interval_days: 2,
  memo: null,
};
