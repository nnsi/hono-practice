import { describe, expect, it, vi } from "vitest";

import type { DebtFeedbackDataSource } from "../computeDebtFeedback";
import { computeDebtFeedbackForActivity } from "../computeDebtFeedback";

// getToday をモックして決定論的なテストにする
vi.mock("../../utils/dateUtils", () => ({
  getToday: () => "2026-03-05",
}));

const makeDataSource = (
  overrides: Partial<DebtFeedbackDataSource> = {},
): DebtFeedbackDataSource => ({
  getActiveGoalsForActivity: vi.fn().mockResolvedValue([]),
  getActivityLogs: vi.fn().mockResolvedValue([]),
  getFreezePeriods: vi.fn().mockResolvedValue([]),
  ...overrides,
});

const baseGoal = {
  id: "goal-1",
  activityId: "activity-1",
  dailyTargetQuantity: 10,
  startDate: "2026-03-01",
  endDate: null,
  isActive: true,
  deletedAt: null,
  description: undefined,
  debtCap: null,
};

describe("computeDebtFeedbackForActivity", () => {
  describe("quantityRecorded <= 0 → 空配列を返す", () => {
    it("quantity が 0 の場合", async () => {
      // Arrange
      const dataSource = makeDataSource();

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        0,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toEqual([]);
      expect(dataSource.getActiveGoalsForActivity).not.toHaveBeenCalled();
    });

    it("quantity が負の場合", async () => {
      // Arrange
      const dataSource = makeDataSource();

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        -5,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toEqual([]);
      expect(dataSource.getActiveGoalsForActivity).not.toHaveBeenCalled();
    });
  });

  describe("goals がない場合 → 空配列を返す", () => {
    it("アクティブなゴールが0件", async () => {
      // Arrange
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toEqual([]);
      expect(dataSource.getActiveGoalsForActivity).toHaveBeenCalledWith(
        "activity-1",
      );
      expect(dataSource.getActivityLogs).not.toHaveBeenCalled();
    });
  });

  describe("日付範囲外のゴール → スキップされる", () => {
    it("date がゴール開始日より前の場合はスキップ", async () => {
      // Arrange
      const goal = { ...baseGoal, startDate: "2026-03-10" };
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([goal]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05", // startDate より前
        dataSource,
      );

      // Assert
      expect(result).toEqual([]);
      expect(dataSource.getActivityLogs).not.toHaveBeenCalled();
    });

    it("date がゴール終了日より後の場合はスキップ", async () => {
      // Arrange
      const goal = {
        ...baseGoal,
        startDate: "2026-03-01",
        endDate: "2026-03-03",
      };
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([goal]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05", // endDate より後
        dataSource,
      );

      // Assert
      expect(result).toEqual([]);
      expect(dataSource.getActivityLogs).not.toHaveBeenCalled();
    });
  });

  describe("正常系: ゴールに対してフィードバックが返る", () => {
    it("ゴールが1件あり、記録量が正の場合にフィードバックを返す", async () => {
      // Arrange
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([baseGoal]),
        getActivityLogs: vi.fn().mockResolvedValue([]),
        getFreezePeriods: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        10,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].quantityRecorded).toBe(10);
      expect(result[0].dailyTarget).toBe(10);
      expect(typeof result[0].balanceBefore).toBe("number");
      expect(typeof result[0].balanceAfter).toBe("number");
      expect(dataSource.getActivityLogs).toHaveBeenCalledWith(
        "activity-1",
        baseGoal.startDate,
        "2026-03-05",
      );
      expect(dataSource.getFreezePeriods).toHaveBeenCalledWith("goal-1");
    });

    it("ゴールの終了日が今日より前の場合は effectiveEnd としてendDateを使う", async () => {
      // Arrange
      const goal = {
        ...baseGoal,
        endDate: "2026-03-03",
      };
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([goal]),
        getActivityLogs: vi.fn().mockResolvedValue([]),
        getFreezePeriods: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-03", // endDate 当日
        dataSource,
      );

      // Assert
      expect(result).toHaveLength(1);
      // effectiveEnd = endDate (2026-03-03) < today (2026-03-05)
      expect(dataSource.getActivityLogs).toHaveBeenCalledWith(
        "activity-1",
        "2026-03-01",
        "2026-03-03",
      );
    });
  });

  describe("複数ゴールの場合: goalLabel が設定される", () => {
    it("ゴールが2件ある場合、goalLabel が設定される", async () => {
      // Arrange
      const goal1 = {
        ...baseGoal,
        id: "goal-1",
        description: "朝のランニング",
        dailyTargetQuantity: 5,
      };
      const goal2 = {
        ...baseGoal,
        id: "goal-2",
        description: "夜のランニング",
        dailyTargetQuantity: 10,
      };
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([goal1, goal2]),
        getActivityLogs: vi.fn().mockResolvedValue([]),
        getFreezePeriods: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].goalLabel).toBe("朝のランニング");
      expect(result[1].goalLabel).toBe("夜のランニング");
    });

    it("descriptionがない場合は dailyTargetQuantity/日 がフォールバックラベルになる", async () => {
      // Arrange
      const goal1 = {
        ...baseGoal,
        id: "goal-1",
        description: undefined,
        dailyTargetQuantity: 5,
      };
      const goal2 = {
        ...baseGoal,
        id: "goal-2",
        description: undefined,
        dailyTargetQuantity: 10,
      };
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([goal1, goal2]),
        getActivityLogs: vi.fn().mockResolvedValue([]),
        getFreezePeriods: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].goalLabel).toBe("目標5/日");
      expect(result[1].goalLabel).toBe("目標10/日");
    });

    it("ゴールが1件の場合、goalLabel は null になる", async () => {
      // Arrange
      const dataSource = makeDataSource({
        getActiveGoalsForActivity: vi.fn().mockResolvedValue([baseGoal]),
        getActivityLogs: vi.fn().mockResolvedValue([]),
        getFreezePeriods: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await computeDebtFeedbackForActivity(
        "activity-1",
        5,
        "2026-03-05",
        dataSource,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].goalLabel).toBeNull();
    });
  });
});
