import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSafeSyncWatermarkISOString,
  getServerNowISOString,
  resetServerTimeForTests,
  trackServerTimeHeader,
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

  it("uses the earliest response Date header for sync watermark", () => {
    const watermark = getSafeSyncWatermarkISOString([
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:10 GMT" }) },
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:07 GMT" }) },
      { headers: new Headers({ date: "Thu, 01 Jan 1970 00:00:09 GMT" }) },
    ]);

    expect(watermark).toBe("1970-01-01T00:00:06.000Z");
  });
});
