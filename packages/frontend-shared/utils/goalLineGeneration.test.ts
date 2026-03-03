import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { generateGoalLines } from "./goalLineGeneration";

const makeGoal = (
  overrides: Partial<
    Parameters<typeof generateGoalLines>[0]["goals"][number]
  > = {},
) => ({
  id: "goal-1",
  activityId: "act-1",
  dailyTargetQuantity: 3,
  startDate: "2024-06-01",
  endDate: null as string | null,
  ...overrides,
});

describe("generateGoalLines", () => {
  it("ゴールが空の場合、空配列を返す", () => {
    const result = generateGoalLines({
      activityId: "act-1",
      goals: [],
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toEqual([]);
  });

  it("対象アクティビティに一致するゴールのみ返す", () => {
    const goals = [
      makeGoal({ id: "g1", activityId: "act-1" }),
      makeGoal({ id: "g2", activityId: "act-2" }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });

  it("ゴールの期間が月と重なる場合に返す", () => {
    const goals = [
      makeGoal({
        startDate: "2024-05-15",
        endDate: "2024-06-15",
      }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(1);
  });

  it("ゴールが月より前に終了している場合は除外する", () => {
    const goals = [
      makeGoal({
        startDate: "2024-04-01",
        endDate: "2024-05-31",
      }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(0);
  });

  it("ゴールが月より後に開始する場合は除外する", () => {
    const goals = [
      makeGoal({
        startDate: "2024-07-01",
      }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(0);
  });

  it("endDateがnullのゴールは無期限として扱う", () => {
    const goals = [
      makeGoal({
        startDate: "2024-01-01",
        endDate: null,
      }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(1);
  });

  it("ラベルにdailyTargetQuantityと単位を含む", () => {
    const goals = [makeGoal({ dailyTargetQuantity: 5 })];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "km",
      dayjs,
    });
    expect(result[0].label).toBe("目標: 5km");
    expect(result[0].value).toBe(5);
    expect(result[0].color).toBe("#ff6b6b");
  });

  it("複数ゴールの場合、番号付きラベルを返す", () => {
    const goals = [
      makeGoal({ id: "g1", dailyTargetQuantity: 3 }),
      makeGoal({ id: "g2", dailyTargetQuantity: 5 }),
    ];
    const result = generateGoalLines({
      activityId: "act-1",
      goals,
      month: "2024-06",
      quantityUnit: "回",
      dayjs,
    });
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("目標1: 3回");
    expect(result[1].label).toBe("目標2: 5回");
  });
});
