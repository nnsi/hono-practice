import { describe, expect, test } from "vitest";

import { calculateDebtFeedback } from "./goalDebtFeedback";

const baseGoal = {
  dailyTargetQuantity: 10,
  startDate: "2026-03-01",
  endDate: null as string | null,
  debtCap: null as number | null,
};

describe("calculateDebtFeedback", () => {
  test("目標達成: 今日の記録量が日次目標以上", () => {
    const result = calculateDebtFeedback(
      baseGoal,
      [], // 今日以前のログなし
      10, // ちょうど目標
      "2026-03-01",
      "2026-03-01",
    );

    expect(result.targetAchievedToday).toBe(true);
    expect(result.debtCleared).toBe(true); // -10 → 0
    expect(result.balanceBefore).toBe(-10); // 0 - 10
    expect(result.balanceAfter).toBe(0);
    expect(result.savedAmount).toBe(10);
  });

  test("目標達成: 複数回の記録で目標に到達", () => {
    const logsBefore = [{ date: "2026-03-01", quantity: 6 }];
    const result = calculateDebtFeedback(
      baseGoal,
      logsBefore,
      5, // 6 + 5 = 11 >= 10
      "2026-03-01",
      "2026-03-01",
    );

    expect(result.targetAchievedToday).toBe(true);
    expect(result.balanceBefore).toBe(-4); // 6 - 10
    expect(result.balanceAfter).toBe(1); // 11 - 10
  });

  test("負債完済: 負→0以上に", () => {
    // 3日目で、1日目2日目は記録なし（負債-20）
    const result = calculateDebtFeedback(
      baseGoal,
      [], // ログなし
      30, // まとめて記録
      "2026-03-03",
      "2026-03-03",
    );

    expect(result.balanceBefore).toBe(-30); // 0 - 30 (3日分)
    expect(result.balanceAfter).toBe(0); // 30 - 30
    expect(result.debtCleared).toBe(true);
    expect(result.targetAchievedToday).toBe(true); // 30 >= 10
  });

  test("負債減少: 負→負だが改善", () => {
    const result = calculateDebtFeedback(
      baseGoal,
      [], // 2日分の負債(-20)
      5, // 部分的に記録
      "2026-03-02",
      "2026-03-02",
    );

    expect(result.balanceBefore).toBe(-20);
    expect(result.balanceAfter).toBe(-15);
    expect(result.debtReduced).toBe(true);
    expect(result.debtCleared).toBe(false);
    expect(result.targetAchievedToday).toBe(false);
    expect(result.savedAmount).toBe(5);
  });

  test("部分達成(2-B): savedAmountで節約量が分かる", () => {
    const result = calculateDebtFeedback(
      baseGoal,
      [],
      3,
      "2026-03-01",
      "2026-03-01",
    );

    expect(result.targetAchievedToday).toBe(false);
    expect(result.savedAmount).toBe(3); // 何もしなかったら-10、3やったら-7
    expect(result.balanceBefore).toBe(-10);
    expect(result.balanceAfter).toBe(-7);
  });

  test("debt cap: capにより免除された量が分かる", () => {
    const goal = { ...baseGoal, debtCap: 15 };
    // 3日目、ログなし → rawBalance = -30, capped = -15
    const result = calculateDebtFeedback(
      goal,
      [],
      5,
      "2026-03-03",
      "2026-03-03",
    );

    // before: raw = -30, capped to -15
    expect(result.balanceBefore).toBe(-15);
    // after: raw = -25, capped to -15 (まだcap圏内)
    expect(result.balanceAfter).toBe(-15);
    expect(result.debtCapSaved).toBeGreaterThan(0); // 25-15=10免除
    expect(result.savedAmount).toBe(0); // capのせいで見かけの変化なし
  });

  test("debt cap: 記録でcap圏外に出る", () => {
    const goal = { ...baseGoal, debtCap: 15 };
    // 2日目、ログなし → rawBalance = -20, capped = -15
    const result = calculateDebtFeedback(
      goal,
      [],
      10,
      "2026-03-02",
      "2026-03-02",
    );

    expect(result.balanceBefore).toBe(-15); // capped
    expect(result.balanceAfter).toBe(-10); // raw = -10, no cap needed
    expect(result.debtCapSaved).toBe(0); // afterではcap不要
    expect(result.savedAmount).toBe(5); // -15 → -10
  });

  test("フリーズ期間中: 記録は貯金になる", () => {
    const freezePeriods = [{ startDate: "2026-03-01", endDate: "2026-03-03" }];
    // フリーズ中なので target=0, actual=0 → balance=0
    const result = calculateDebtFeedback(
      baseGoal,
      [],
      5,
      "2026-03-02",
      "2026-03-02",
      freezePeriods,
    );

    expect(result.balanceBefore).toBe(0); // フリーズ中は target=0
    expect(result.balanceAfter).toBe(5); // 記録分がプラスに
    expect(result.savedAmount).toBe(5);
    expect(result.targetAchievedToday).toBe(false); // 5 < 10 (フリーズ中でも日次目標自体は不変)
  });

  test("記録量0: 何も変わらない", () => {
    const result = calculateDebtFeedback(
      baseGoal,
      [],
      0,
      "2026-03-01",
      "2026-03-01",
    );

    expect(result.savedAmount).toBe(0);
    expect(result.targetAchievedToday).toBe(false);
    expect(result.debtCleared).toBe(false);
    expect(result.debtReduced).toBe(false);
  });

  test("既にプラス残高: surplusが増える", () => {
    const logsBefore = [{ date: "2026-03-01", quantity: 20 }];
    const result = calculateDebtFeedback(
      baseGoal,
      logsBefore,
      5,
      "2026-03-01",
      "2026-03-01",
    );

    expect(result.balanceBefore).toBe(10); // 20 - 10
    expect(result.balanceAfter).toBe(15); // 25 - 10
    expect(result.debtCleared).toBe(false);
    expect(result.debtReduced).toBe(false);
    expect(result.targetAchievedToday).toBe(true);
  });

  test("dayTargets: 休日（目標0）に記録 → targetAchievedToday: true, 貯金", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-05", // Mon
      dayTargets: { 7: 0 } as const, // Sunday = rest day
      endDate: null,
    };
    const logsBefore: { date: string; quantity: number | null }[] = [];
    // 2026-01-11 is Sunday (target = 0)
    const result = calculateDebtFeedback(
      goal,
      logsBefore,
      5,
      "2026-01-11",
      "2026-01-11",
    );

    expect(result.targetAchievedToday).toBe(true);
    expect(result.dailyTarget).toBe(0);
    expect(result.balanceAfter).toBeGreaterThan(result.balanceBefore);
  });

  test("dayTargets: 平日（目標あり）に記録 → 正常に判定", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-05", // Mon
      dayTargets: { 1: 15, 7: 0 } as const,
      endDate: null,
    };
    const logsBefore: { date: string; quantity: number | null }[] = [];
    // 2026-01-05 is Monday (target = 15)
    const result = calculateDebtFeedback(
      goal,
      logsBefore,
      10,
      "2026-01-05",
      "2026-01-05",
    );

    expect(result.targetAchievedToday).toBe(false); // 10 < 15
    expect(result.dailyTarget).toBe(15);
  });
});
