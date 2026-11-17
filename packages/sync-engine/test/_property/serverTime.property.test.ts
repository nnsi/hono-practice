import { fc, test } from "@fast-check/vitest";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import {
  getServerNowISOString,
  resetServerTimeForTests,
  trackServerTimeHeader,
  trackServerTimestamps,
} from "../../core/serverTime";

const START = Date.parse("2026-02-28T23:59:58.500Z");

type Action =
  | { type: "advance"; ms: number }
  | { type: "header"; serverAheadMs: number }
  | { type: "observe"; serverAheadMs: number }
  | { type: "issue" };

const actionArb: fc.Arbitrary<Action> = fc.oneof(
  fc.record({
    type: fc.constant("advance" as const),
    ms: fc.integer({ min: 0, max: 3_000 }),
  }),
  // 端末時計とサーバー時計のずれ（遅れ・進み）と、秒精度の Date ヘッダー
  fc.record({
    type: fc.constant("header" as const),
    serverAheadMs: fc.integer({ min: -120_000, max: 120_000 }),
  }),
  // push の応答や server wins で届く、サーバーが保存した updatedAt
  fc.record({
    type: fc.constant("observe" as const),
    serverAheadMs: fc.integer({ min: -120_000, max: 120_000 }),
  }),
  fc.record({ type: fc.constant("issue" as const) }),
);

describe("serverTime", () => {
  beforeEach(() => {
    resetServerTimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetServerTimeForTests();
  });

  test.prop([fc.array(actionArb, { minLength: 1, maxLength: 60 })])(
    "発行する時刻は単調増加し、観測済みのサーバー updatedAt より必ず後になる",
    (actions) => {
      resetServerTimeForTests();
      let deviceNow = START;
      const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => deviceNow);
      let lastIssued = Number.NEGATIVE_INFINITY;
      let latestObserved = Number.NEGATIVE_INFINITY;

      try {
        for (const action of actions) {
          if (action.type === "advance") {
            deviceNow += action.ms;
          } else if (action.type === "header") {
            const serverNow = deviceNow + action.serverAheadMs;
            trackServerTimeHeader(
              new Date(Math.floor(serverNow / 1000) * 1000).toUTCString(),
            );
          } else if (action.type === "observe") {
            const observed = deviceNow + action.serverAheadMs;
            trackServerTimestamps([new Date(observed).toISOString()]);
            latestObserved = Math.max(latestObserved, observed);
          } else {
            const issued = Date.parse(getServerNowISOString());
            expect(issued).toBeGreaterThan(lastIssued);
            expect(issued).toBeGreaterThan(latestObserved);
            lastIssued = issued;
          }
        }
      } finally {
        nowSpy.mockRestore();
      }
    },
  );
});
