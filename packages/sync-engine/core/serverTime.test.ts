import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSafeSyncWatermarkISOString,
  getServerNowISOString,
  resetServerTimeForTests,
  trackServerTimeHeader,
  trackServerTimestamps,
} from "./serverTime";

describe("serverTime", () => {
  beforeEach(() => {
    resetServerTimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetServerTimeForTests();
  });

  it("uses tracked server offset when generating timestamps", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    trackServerTimeHeader("Thu, 01 Jan 1970 00:00:05 GMT");

    nowSpy.mockReturnValue(1500);
    expect(getServerNowISOString()).toBe("1970-01-01T00:00:05.500Z");
  });

  it("issues timestamps after every server updatedAt it has observed", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(Date.parse("2026-11-17T08:00:14.900Z"));
    // 14.900 に届いた Date: 14.000 → 推定サーバー時刻は 900ms 遅れる
    trackServerTimeHeader("Tue, 17 Nov 2026 08:00:14 GMT");
    // サーバーが push を受理して保存した updatedAt
    trackServerTimestamps(["2026-11-17T08:00:14.806Z", null, "not a date"]);

    nowSpy.mockReturnValue(Date.parse("2026-11-17T08:00:15.050Z"));
    expect(getServerNowISOString()).toBe("2026-11-17T08:00:14.807Z");
    expect(getServerNowISOString()).toBe("2026-11-17T08:00:14.808Z");

    // 推定時刻が追いついたら通常どおり進む
    nowSpy.mockReturnValue(Date.parse("2026-11-17T08:00:16.000Z"));
    expect(getServerNowISOString()).toBe("2026-11-17T08:00:15.100Z");
  });

  it("uses the earliest response Date header for sync watermark", () => {
    const watermark = getSafeSyncWatermarkISOString([
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:10 GMT" }) },
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:07 GMT" }) },
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:09 GMT" }) },
    ]);

    expect(watermark).toBe("1970-01-01T00:00:06.000Z");
  });
});
