import { describe, expect, it } from "vitest";

import { isDailyGoalJustAchieved } from "./goalAchievement";

describe("isDailyGoalJustAchieved", () => {
  it("今回の記録で目標を達成した場合 true", () => {
    expect(isDailyGoalJustAchieved(30, 20, 15)).toBe(true);
  });

  it("ちょうど目標に到達した場合 true", () => {
    expect(isDailyGoalJustAchieved(30, 20, 10)).toBe(true);
  });

  it("記録前に既に達成済みの場合 false", () => {
    expect(isDailyGoalJustAchieved(30, 30, 5)).toBe(false);
    expect(isDailyGoalJustAchieved(30, 35, 5)).toBe(false);
  });

  it("記録後もまだ未達の場合 false", () => {
    expect(isDailyGoalJustAchieved(30, 10, 5)).toBe(false);
  });

  it("dailyTarget が 0 以下の場合 false", () => {
    expect(isDailyGoalJustAchieved(0, 0, 5)).toBe(false);
    expect(isDailyGoalJustAchieved(-1, 0, 5)).toBe(false);
  });

  it("newQuantity が 0 以下の場合 false", () => {
    expect(isDailyGoalJustAchieved(30, 20, 0)).toBe(false);
    expect(isDailyGoalJustAchieved(30, 20, -5)).toBe(false);
  });

  it("previousTotal が 0 で一発達成の場合 true", () => {
    expect(isDailyGoalJustAchieved(10, 0, 10)).toBe(true);
    expect(isDailyGoalJustAchieved(10, 0, 15)).toBe(true);
  });
});
