import { describe, expect, it } from "vitest";

import { calcSecondsUntilGoalNotification } from "./goalNotification";

describe("calcSecondsUntilGoalNotification", () => {
  it("目標120分、既存ログ0分 → 90分後に通知 (5400秒)", () => {
    // 120分 - 30分 = 90分の閾値。既存0なので90分後
    expect(calcSecondsUntilGoalNotification(120, 0, 60)).toBe(5400);
  });

  it("目標2時間、既存0時間 → 5400秒後に通知", () => {
    // 2h - 0.5h = 1.5h の閾値。1.5h = 5400秒
    expect(calcSecondsUntilGoalNotification(2, 0, 3600)).toBe(5400);
  });

  it("目標60分、既存20分 → 10分後に通知 (600秒)", () => {
    // 60分 - 30分 = 30分の閾値。30分 - 20分 = 10分
    expect(calcSecondsUntilGoalNotification(60, 20, 60)).toBe(600);
  });

  it("目標60分、既存40分 → 既に閾値を超えている (-600秒)", () => {
    // 60分 - 30分 = 30分の閾値。30分 - 40分 = -10分
    expect(calcSecondsUntilGoalNotification(60, 40, 60)).toBe(-600);
  });

  it("目標20分 → 閾値が負 (-10分)、既存0でも残りは負", () => {
    // 20分 - 30分 = -10分の閾値。-10分 - 0分 = -600秒
    expect(calcSecondsUntilGoalNotification(20, 0, 60)).toBe(-600);
  });

  it("dailyTarget が 0 以下の場合 -1", () => {
    expect(calcSecondsUntilGoalNotification(0, 0, 60)).toBe(-1);
    expect(calcSecondsUntilGoalNotification(-5, 0, 60)).toBe(-1);
  });

  it("unitToSeconds が 0 以下の場合 -1", () => {
    expect(calcSecondsUntilGoalNotification(120, 0, 0)).toBe(-1);
  });

  it("目標30分ちょうど → 閾値0秒、既存0なら残り0秒", () => {
    // 30分 - 30分 = 0の閾値。0 - 0 = 0
    expect(calcSecondsUntilGoalNotification(30, 0, 60)).toBe(0);
  });
});
