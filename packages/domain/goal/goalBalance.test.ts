import { describe, expect, it } from "vitest";
import { calculateGoalBalance } from "./goalBalance";

describe("calculateGoalBalance", () => {
  it("基本ケース: startDateからtodayまで、ログありで計算する", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 12 },
      { date: "2026-01-02", quantity: 8 },
      { date: "2026-01-03", quantity: 10 },
    ];
    const today = "2026-01-03";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.daysActive).toBe(3); // 1/1, 1/2, 1/3 (both ends included)
    expect(result.totalTarget).toBe(30); // 3 * 10
    expect(result.totalActual).toBe(30); // 12 + 8 + 10
    expect(result.currentBalance).toBe(0); // 30 - 30
    expect(result.dailyTarget).toBe(10);
    expect(result.lastCalculatedDate).toBe("2026-01-03");
  });

  it("startDateが未来の場合、daysActiveは0", () => {
    const goal = {
      dailyTargetQuantity: 5,
      startDate: "2026-02-01",
      endDate: null,
    };
    const logs: { date: string; quantity: number | null }[] = [];
    const today = "2026-01-15";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.daysActive).toBe(0);
    expect(result.totalTarget).toBe(0);
    expect(result.totalActual).toBe(0);
    expect(result.currentBalance).toBe(0);
  });

  it("endDateが過去の場合、endDateまでで計算する", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: "2026-01-05",
    };
    const logs = [
      { date: "2026-01-01", quantity: 10 },
      { date: "2026-01-02", quantity: 10 },
      { date: "2026-01-03", quantity: 10 },
      { date: "2026-01-06", quantity: 100 }, // endDate後 → 無視される
    ];
    const today = "2026-01-10";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.daysActive).toBe(5); // 1/1〜1/5
    expect(result.totalTarget).toBe(50); // 5 * 10
    expect(result.totalActual).toBe(30); // 10 + 10 + 10 (1/6は範囲外)
    expect(result.currentBalance).toBe(-20); // 30 - 50
    expect(result.lastCalculatedDate).toBe("2026-01-05");
  });

  it("endDateがnullの場合、todayまでで計算する", () => {
    const goal = {
      dailyTargetQuantity: 5,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [{ date: "2026-01-01", quantity: 3 }];
    const today = "2026-01-02";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.daysActive).toBe(2);
    expect(result.totalTarget).toBe(10); // 2 * 5
    expect(result.totalActual).toBe(3);
    expect(result.currentBalance).toBe(-7); // 3 - 10
    expect(result.lastCalculatedDate).toBe("2026-01-02");
  });

  it("ログがない場合、totalActualは0", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs: { date: string; quantity: number | null }[] = [];
    const today = "2026-01-05";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.daysActive).toBe(5);
    expect(result.totalTarget).toBe(50);
    expect(result.totalActual).toBe(0);
    expect(result.currentBalance).toBe(-50);
  });

  it("負債（マイナスバランス）: 実績が目標を下回る場合", () => {
    const goal = {
      dailyTargetQuantity: 20,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 5 },
      { date: "2026-01-02", quantity: 5 },
    ];
    const today = "2026-01-02";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.currentBalance).toBe(-30); // 10 - 40
    expect(result.totalTarget).toBe(40);
    expect(result.totalActual).toBe(10);
  });

  it("貯金（プラスバランス）: 実績が目標を上回る場合", () => {
    const goal = {
      dailyTargetQuantity: 5,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 20 },
      { date: "2026-01-02", quantity: 15 },
    ];
    const today = "2026-01-02";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.currentBalance).toBe(25); // 35 - 10
    expect(result.totalTarget).toBe(10);
    expect(result.totalActual).toBe(35);
  });

  it("quantityがnullのログは0として扱う", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: null },
      { date: "2026-01-02", quantity: 5 },
    ];
    const today = "2026-01-02";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.totalActual).toBe(5); // null → 0, + 5
  });

  it("startDate範囲外のログは無視する", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-05",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-03", quantity: 100 }, // startDateより前 → 無視
      { date: "2026-01-05", quantity: 15 },
    ];
    const today = "2026-01-05";

    const result = calculateGoalBalance(goal, logs, today);

    expect(result.totalActual).toBe(15);
    expect(result.daysActive).toBe(1);
  });
});
