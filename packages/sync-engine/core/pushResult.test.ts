import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revisionsForIds, trackSyncResultTimestamps } from "./pushResult";
import { getServerNowISOString, resetServerTimeForTests } from "./serverTime";

describe("revisionsForIds", () => {
  it("レスポンスの id を、送信した版（id + updatedAt）へ対応づける", () => {
    const sent = [
      { id: "a", updatedAt: "2026-01-01T00:00:00.000Z", title: "A" },
      { id: "b", updatedAt: "2026-01-02T00:00:00.000Z", title: "B" },
    ];

    expect(revisionsForIds(sent, ["b"])).toEqual([
      { id: "b", updatedAt: "2026-01-02T00:00:00.000Z" },
    ]);
  });

  it("送っていない id は無視する", () => {
    expect(
      revisionsForIds(
        [{ id: "a", updatedAt: "2026-01-01T00:00:00.000Z" }],
        ["unknown"],
      ),
    ).toEqual([]);
  });
});

describe("trackSyncResultTimestamps", () => {
  beforeEach(() => {
    resetServerTimeForTests();
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-11-17T08:00:14.326Z"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetServerTimeForTests();
  });

  it("受理された行の保存済み updatedAt より後の時刻を発行する", () => {
    trackSyncResultTimestamps({
      syncedIds: ["t1"],
      syncedRevisions: [{ id: "t1", updatedAt: "2026-11-17T08:00:14.806Z" }],
      serverWins: [],
      skippedIds: [],
    });

    expect(getServerNowISOString()).toBe("2026-11-17T08:00:14.807Z");
  });

  it("serverWins の行（camelCase / snake_case）の updatedAt も反映する", () => {
    trackSyncResultTimestamps({
      syncedIds: [],
      serverWins: [
        { id: "t1", updatedAt: "2026-11-17T08:00:15.000Z" },
        { id: "t2", updated_at: "2026-11-17T08:00:16.000Z" },
      ],
      skippedIds: [],
    });

    expect(getServerNowISOString()).toBe("2026-11-17T08:00:16.001Z");
  });

  it("syncedRevisions を返さない旧バックエンドの応答でも動く", () => {
    trackSyncResultTimestamps({
      syncedIds: ["t1"],
      serverWins: [],
      skippedIds: [],
    });

    expect(getServerNowISOString()).toBe("2026-11-17T08:00:14.326Z");
  });
});
