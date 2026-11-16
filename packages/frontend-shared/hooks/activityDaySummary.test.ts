import { describe, expect, it } from "vitest";

import {
  formatActivityDaySummary,
  summarizeLogsByActivity,
} from "./activityDaySummary";

describe("summarizeLogsByActivity", () => {
  it("ログが無ければ空の Map を返す", () => {
    expect(summarizeLogsByActivity([]).size).toBe(0);
  });

  it("アクティビティ別に件数と数量を合計する", () => {
    const summary = summarizeLogsByActivity([
      { activityId: "run", quantity: 4.7 },
      { activityId: "water", quantity: 710 },
      { activityId: "run", quantity: 5.2 },
    ]);

    expect(summary.get("run")?.count).toBe(2);
    expect(summary.get("run")?.total).toBeCloseTo(9.9);
    expect(summary.get("water")).toEqual({ count: 1, total: 710 });
  });

  it("数量の無い記録だけなら total は null のまま件数だけ数える", () => {
    const summary = summarizeLogsByActivity([
      { activityId: "diary", quantity: null },
      { activityId: "diary", quantity: null },
    ]);

    expect(summary.get("diary")).toEqual({ count: 2, total: null });
  });

  it("数量あり・なしが混ざっていれば数量ありだけ合計し、件数は全て数える", () => {
    const summary = summarizeLogsByActivity([
      { activityId: "read", quantity: null },
      { activityId: "read", quantity: 32 },
    ]);

    expect(summary.get("read")).toEqual({ count: 2, total: 32 });
  });

  it("数量 0 の記録は「数量なし」と区別して合計 0 にする", () => {
    const summary = summarizeLogsByActivity([
      { activityId: "walk", quantity: 0 },
    ]);

    expect(summary.get("walk")).toEqual({ count: 1, total: 0 });
  });
});

describe("formatActivityDaySummary", () => {
  const format = (total: number) => `${total}km`;

  it("未記録なら null を返す", () => {
    expect(formatActivityDaySummary(undefined, format)).toBeNull();
    expect(
      formatActivityDaySummary({ count: 0, total: null }, format),
    ).toBeNull();
  });

  it("数量があれば合計を整形する", () => {
    expect(formatActivityDaySummary({ count: 2, total: 9.9 }, format)).toBe(
      "9.9km",
    );
  });

  it("数量の無い記録だけなら件数を出す", () => {
    expect(formatActivityDaySummary({ count: 3, total: null }, format)).toBe(
      "×3",
    );
  });
});
