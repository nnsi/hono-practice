import { describe, expect, it } from "vitest";

import { generateHeatmapData } from "./goalHeatmap";

describe("generateHeatmapData", () => {
  it("ゴール1つで達成/未達(活動あり)/活動なしを判定する", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-01",
        endDate: null,
      },
    ];
    const logsByActivityId = new Map([
      [
        "a1",
        [
          { date: "2026-01-01", quantity: 15 }, // 達成
          { date: "2026-01-02", quantity: 5 }, // 活動ありだが未達
          // 1/03: 活動なし
        ],
      ],
    ]);

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-01", end: "2026-01-03" },
      "2026-01-03",
    );

    expect(cells).toHaveLength(3);
    expect(cells[0]).toEqual({
      date: "2026-01-01",
      achievedCount: 1,
      activeCount: 1,
      totalGoals: 1,
    });
    expect(cells[1]).toEqual({
      date: "2026-01-02",
      achievedCount: 0,
      activeCount: 1,
      totalGoals: 1,
    });
    expect(cells[2]).toEqual({
      date: "2026-01-03",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 1,
    });
  });

  it("複数ゴールで部分達成を計算する", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-01",
        endDate: null,
      },
      {
        activityId: "a2",
        dailyTargetQuantity: 5,
        startDate: "2026-01-01",
        endDate: null,
      },
      {
        activityId: "a3",
        dailyTargetQuantity: 20,
        startDate: "2026-01-01",
        endDate: null,
      },
    ];
    const logsByActivityId = new Map([
      ["a1", [{ date: "2026-01-01", quantity: 10 }]], // 達成
      ["a2", [{ date: "2026-01-01", quantity: 5 }]], // 達成
      ["a3", [{ date: "2026-01-01", quantity: 10 }]], // 未達だが活動あり
    ]);

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-01", end: "2026-01-01" },
      "2026-01-01",
    );

    expect(cells[0]).toEqual({
      date: "2026-01-01",
      achievedCount: 2,
      activeCount: 3,
      totalGoals: 3,
    });
  });

  it("ゴールの期間が途中で開始/終了するとtotalGoalsが変わる", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-01",
        endDate: null,
      },
      {
        activityId: "a2",
        dailyTargetQuantity: 5,
        startDate: "2026-01-02",
        endDate: "2026-01-02",
      },
    ];
    const logsByActivityId = new Map([
      [
        "a1",
        [
          { date: "2026-01-01", quantity: 10 },
          { date: "2026-01-02", quantity: 10 },
          { date: "2026-01-03", quantity: 10 },
        ],
      ],
      ["a2", [{ date: "2026-01-02", quantity: 5 }]],
    ]);

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-01", end: "2026-01-03" },
      "2026-01-03",
    );

    expect(cells[0]).toEqual({
      date: "2026-01-01",
      achievedCount: 1,
      activeCount: 1,
      totalGoals: 1,
    });
    expect(cells[1]).toEqual({
      date: "2026-01-02",
      achievedCount: 2,
      activeCount: 2,
      totalGoals: 2,
    });
    expect(cells[2]).toEqual({
      date: "2026-01-03",
      achievedCount: 1,
      activeCount: 1,
      totalGoals: 1,
    });
  });

  it("アクティブゴールが0の日はtotalGoals=0", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-02",
        endDate: "2026-01-02",
      },
    ];
    const logsByActivityId = new Map<
      string,
      Array<{ date: string; quantity: number | null }>
    >();

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-01", end: "2026-01-03" },
      "2026-01-03",
    );

    expect(cells[0]).toEqual({
      date: "2026-01-01",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 0,
    });
    expect(cells[1]).toEqual({
      date: "2026-01-02",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 1,
    });
    expect(cells[2]).toEqual({
      date: "2026-01-03",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 0,
    });
  });

  it("ゴール配列が空の場合は全セルtotalGoals=0", () => {
    const cells = generateHeatmapData(
      [],
      new Map(),
      { start: "2026-01-01", end: "2026-01-03" },
      "2026-01-03",
    );

    expect(cells).toHaveLength(3);
    for (const cell of cells) {
      expect(cell.achievedCount).toBe(0);
      expect(cell.activeCount).toBe(0);
      expect(cell.totalGoals).toBe(0);
    }
  });

  it("dayTargets: 休日(target=0)は達成済みとしてカウントされる", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-05", // Mon
        endDate: null,
        dayTargets: { 7: 0 } as const, // Sunday = rest
      },
    ];
    const logsByActivityId = new Map([
      [
        "a1",
        [
          { date: "2026-01-05", quantity: 10 }, // Mon: achieved
          { date: "2026-01-06", quantity: 5 }, // Tue: not achieved
          // Sun 1/11: no activity → rest day → achieved
        ],
      ],
    ]);

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-05", end: "2026-01-11" },
      "2026-01-11",
    );

    // Mon: achieved
    expect(cells[0]).toEqual({
      date: "2026-01-05",
      achievedCount: 1,
      activeCount: 1,
      totalGoals: 1,
    });
    // Sun (rest day): achieved=true, no activity
    const sunday = cells.find((c) => c.date === "2026-01-11");
    expect(sunday).toEqual({
      date: "2026-01-11",
      achievedCount: 1,
      activeCount: 0,
      totalGoals: 1,
    });
  });

  it("未来の日付はtotalGoals=0になる", () => {
    const goals = [
      {
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-01",
        endDate: null,
      },
    ];
    const logsByActivityId = new Map([
      ["a1", [{ date: "2026-01-01", quantity: 10 }]],
    ]);

    const cells = generateHeatmapData(
      goals,
      logsByActivityId,
      { start: "2026-01-01", end: "2026-01-03" },
      "2026-01-01",
    );

    expect(cells[0]).toEqual({
      date: "2026-01-01",
      achievedCount: 1,
      activeCount: 1,
      totalGoals: 1,
    });
    expect(cells[1]).toEqual({
      date: "2026-01-02",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 0,
    });
    expect(cells[2]).toEqual({
      date: "2026-01-03",
      achievedCount: 0,
      activeCount: 0,
      totalGoals: 0,
    });
  });
});
