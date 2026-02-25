import { describe, expect, it } from "vitest";
import {
  calculateGoalStats,
  generateDailyRecords,
  getInactiveDates,
} from "./goalStats";

describe("generateDailyRecords", () => {
  it("ログありで日次レコードを生成する", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 12 },
      { date: "2026-01-02", quantity: 5 },
      // 1/03 はログなし
    ];
    const today = "2026-01-03";

    const records = generateDailyRecords(goal, logs, today);

    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({
      date: "2026-01-01",
      quantity: 12,
      achieved: true,
    });
    expect(records[1]).toEqual({
      date: "2026-01-02",
      quantity: 5,
      achieved: false,
    });
    expect(records[2]).toEqual({
      date: "2026-01-03",
      quantity: 0,
      achieved: false,
    });
  });

  it("同じ日付の複数ログは合算する", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 5 },
      { date: "2026-01-01", quantity: 7 },
    ];
    const today = "2026-01-01";

    const records = generateDailyRecords(goal, logs, today);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      date: "2026-01-01",
      quantity: 12,
      achieved: true,
    });
  });

  it("endDateが過去の場合はendDateまで", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    };
    const logs = [{ date: "2026-01-01", quantity: 10 }];
    const today = "2026-01-10";

    const records = generateDailyRecords(goal, logs, today);

    expect(records).toHaveLength(2); // 1/01, 1/02
  });

  it("quantityがnullのログは0として扱う", () => {
    const goal = {
      dailyTargetQuantity: 5,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [{ date: "2026-01-01", quantity: null }];
    const today = "2026-01-01";

    const records = generateDailyRecords(goal, logs, today);

    expect(records[0].quantity).toBe(0);
    expect(records[0].achieved).toBe(false);
  });
});

describe("calculateGoalStats", () => {
  it("活動日の平均・最大・連続日数・達成日を計算する", () => {
    const records = [
      { date: "2026-01-01", quantity: 10, achieved: true },
      { date: "2026-01-02", quantity: 20, achieved: true },
      { date: "2026-01-03", quantity: 0, achieved: false },
      { date: "2026-01-04", quantity: 15, achieved: true },
      { date: "2026-01-05", quantity: 5, achieved: false },
    ];

    const stats = calculateGoalStats(records);

    // average: (10 + 20 + 15 + 5) / 4 = 12.5
    expect(stats.average).toBe(12.5);
    expect(stats.max).toBe(20);
    expect(stats.achievedDays).toBe(3);
    expect(stats.activeDays).toBe(4);
    // 連続: 1/1-1/2 (2日), 1/4 (1日), 1/5 (連続で2日) → max=2
    expect(stats.maxConsecutiveDays).toBe(2);
  });

  it("全日活動なしの場合", () => {
    const records = [
      { date: "2026-01-01", quantity: 0, achieved: false },
      { date: "2026-01-02", quantity: 0, achieved: false },
    ];

    const stats = calculateGoalStats(records);

    expect(stats.average).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.maxConsecutiveDays).toBe(0);
    expect(stats.achievedDays).toBe(0);
    expect(stats.activeDays).toBe(0);
  });

  it("連続記録が最大になるケース", () => {
    const records = [
      { date: "2026-01-01", quantity: 5, achieved: false },
      { date: "2026-01-02", quantity: 5, achieved: false },
      { date: "2026-01-03", quantity: 5, achieved: false },
      { date: "2026-01-04", quantity: 5, achieved: false },
      { date: "2026-01-05", quantity: 5, achieved: false },
    ];

    const stats = calculateGoalStats(records);

    expect(stats.maxConsecutiveDays).toBe(5);
  });

  it("連続が途切れるケース", () => {
    const records = [
      { date: "2026-01-01", quantity: 5, achieved: false },
      { date: "2026-01-02", quantity: 0, achieved: false },
      { date: "2026-01-03", quantity: 5, achieved: false },
      { date: "2026-01-04", quantity: 5, achieved: false },
      { date: "2026-01-05", quantity: 0, achieved: false },
      { date: "2026-01-06", quantity: 5, achieved: false },
    ];

    const stats = calculateGoalStats(records);

    expect(stats.maxConsecutiveDays).toBe(2); // 1/3-1/4
  });

  it("空のレコード配列", () => {
    const stats = calculateGoalStats([]);

    expect(stats.average).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.maxConsecutiveDays).toBe(0);
    expect(stats.achievedDays).toBe(0);
    expect(stats.activeDays).toBe(0);
  });
});

describe("getInactiveDates", () => {
  it("活動がない日をリストする", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 5 },
      { date: "2026-01-03", quantity: 10 },
    ];
    const today = "2026-01-03";

    const inactive = getInactiveDates(goal, logs, today);

    expect(inactive).toEqual(["2026-01-02"]);
  });

  it("全日活動ありの場合は空配列", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [
      { date: "2026-01-01", quantity: 5 },
      { date: "2026-01-02", quantity: 5 },
    ];
    const today = "2026-01-02";

    const inactive = getInactiveDates(goal, logs, today);

    expect(inactive).toEqual([]);
  });

  it("quantity=0のログは非活動として扱う", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: null,
    };
    const logs = [{ date: "2026-01-01", quantity: 0 }];
    const today = "2026-01-01";

    const inactive = getInactiveDates(goal, logs, today);

    expect(inactive).toEqual(["2026-01-01"]);
  });

  it("endDateが過去の場合はendDateまで", () => {
    const goal = {
      dailyTargetQuantity: 10,
      startDate: "2026-01-01",
      endDate: "2026-01-03",
    };
    const logs: { date: string; quantity: number | null }[] = [];
    const today = "2026-01-10";

    const inactive = getInactiveDates(goal, logs, today);

    expect(inactive).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});
