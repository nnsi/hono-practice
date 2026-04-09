import { useMemo } from "react";

import { renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";

import type { GoalForCard } from "../useGoalCard";
import { createUseGoalCard, getStatusBadge } from "../useGoalCard";

// getToday を固定値でモック
vi.mock("../../utils/dateUtils", () => ({
  getToday: () => "2026-03-15",
}));

// 基準日: 2026-03-15
// startDate を 10日前にすると: 2026-03-05
const TODAY = "2026-03-15";
const START_10_DAYS_AGO = "2026-03-05";

const baseGoal: GoalForCard = {
  id: "goal-1",
  activityId: "activity-1",
  dailyTargetQuantity: 10,
  startDate: START_10_DAYS_AGO,
  endDate: null,
  isActive: true,
  debtCap: null,
};

// TFunc のシンプルなモック: 受け取ったキーをそのまま返す
const t = vi.fn((key: string) => key);

describe("getStatusBadge", () => {
  describe("isActive=false → statusEnded", () => {
    it("非アクティブゴールは終了バッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: false };

      // Act
      const badge = getStatusBadge(goal, false, 0, t);

      // Assert
      expect(badge.label).toBe("statusEnded");
      expect(badge.bgClass).toBe("bg-gray-200");
      expect(badge.textClass).toBe("text-gray-600");
    });

    it("isActive=false の場合、balance や hasTodayLog に関わらず statusEnded を返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: false };

      // Act
      const badge = getStatusBadge(goal, true, 100, t);

      // Assert
      expect(badge.label).toBe("statusEnded");
    });
  });

  describe("balance < 0 → statusInDebt", () => {
    it("残高がマイナスの場合は負債バッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, false, -5, t);

      // Assert
      expect(badge.label).toBe("statusInDebt");
      expect(badge.bgClass).toBe("bg-red-100");
      expect(badge.textClass).toBe("text-red-700");
    });

    it("残高が -1 の場合も負債バッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, true, -1, t);

      // Assert
      expect(badge.label).toBe("statusInDebt");
    });
  });

  describe("hasTodayLog=true → statusOnTrack", () => {
    it("今日のログがある場合は順調バッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, true, 0, t);

      // Assert
      expect(badge.label).toBe("statusOnTrack");
      expect(badge.bgClass).toBe("bg-green-100");
      expect(badge.textClass).toBe("text-green-700");
    });

    it("今日のログがあり残高が正の場合も statusOnTrack を返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, true, 50, t);

      // Assert
      expect(badge.label).toBe("statusOnTrack");
    });
  });

  describe("デフォルト → 達成ペース", () => {
    it("アクティブ・残高ゼロ・今日のログなし → 達成ペースバッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, false, 0, t);

      // Assert
      expect(badge.label).toBe("statusOnPace");
      expect(badge.bgClass).toBe("bg-green-50");
      expect(badge.textClass).toBe("text-green-600");
    });

    it("アクティブ・残高プラス・今日のログなし → 達成ペースバッジを返す", () => {
      // Arrange
      const goal: GoalForCard = { ...baseGoal, isActive: true };

      // Act
      const badge = getStatusBadge(goal, false, 10, t);

      // Assert
      expect(badge.label).toBe("statusOnPace");
      expect(badge.bgClass).toBe("bg-green-50");
      expect(badge.textClass).toBe("text-green-600");
    });
  });
});

// ────────────────────────────────────────────────────────────
// createUseGoalCard の renderHook テスト
// ────────────────────────────────────────────────────────────

function makeUseGoalCard(
  overrides: {
    useTodayLogCount?: (
      activityId: string,
      today: string,
    ) => number | undefined;
    usePeriodLogs?: (
      activityId: string,
      startDate: string,
      endDate: string,
    ) => { date: string; quantity: number | null }[] | undefined;
    useFreezePeriods?: (
      goalId: string,
    ) => { startDate: string; endDate: string | null }[] | undefined;
    useInactiveDates?: (
      goal: GoalForCard,
      today: string,
    ) => { showInactiveDatesEnabled: boolean; inactiveDates: string[] };
  } = {},
) {
  return createUseGoalCard({
    react: { useMemo },
    useTranslation: vi.fn(() => ({ t: (key: string) => key })),
    dayjs,
    useTodayLogCount: overrides.useTodayLogCount ?? vi.fn(() => 0),
    usePeriodLogs: overrides.usePeriodLogs ?? vi.fn(() => []),
    useFreezePeriods: overrides.useFreezePeriods ?? vi.fn(() => []),
    useInactiveDates:
      overrides.useInactiveDates ??
      vi.fn(() => ({ showInactiveDatesEnabled: false, inactiveDates: [] })),
  });
}

describe("createUseGoalCard (renderHook)", () => {
  // ─── 1. 基本計算 ──────────────────────────────────────────
  describe("基本計算: periodLogs=[], freezePeriods=[], todayLogCount=0", () => {
    it("balance 系の値が正しく計算される", () => {
      // Arrange
      // startDate=2026-03-05, today=2026-03-15 → 11日経過
      // dailyTarget=10, totalTarget=110, totalActual=0 → balance=-110
      const useGoalCard = makeUseGoalCard();

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      expect(result.current.today).toBe(TODAY);
      expect(result.current.balance.totalTarget).toBe(110); // 11日 × 10
      expect(result.current.balance.totalActual).toBe(0);
      expect(result.current.localBalance).toBe(-110);
      expect(result.current.elapsedDays).toBe(11);
    });
  });

  // ─── 2. today ログあり → statusOnTrack ─────────────────────
  describe("today ログあり: todayLogCount=1", () => {
    it("statusBadge が statusOnTrack になる", () => {
      // Arrange
      // balance が負にならないよう startDate=today のゴールを使う（経過日数=1, totalTarget=10）
      // periodLogs で totalActual=10 を供給し balance=0 にしてから hasTodayLog=true を確認
      const todayGoal: GoalForCard = {
        ...baseGoal,
        startDate: TODAY,
        endDate: null,
      };
      const useGoalCard = makeUseGoalCard({
        useTodayLogCount: vi.fn(() => 1),
        usePeriodLogs: vi.fn(() => [{ date: TODAY, quantity: 10 }]),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(todayGoal));

      // Assert
      expect(result.current.statusBadge.label).toBe("statusOnTrack");
    });
  });

  // ─── 3. freeze 期間 ───────────────────────────────────────
  describe("freeze 期間", () => {
    it("今日が freeze 期間内なら isCurrentlyFrozen=true", () => {
      // Arrange: freeze period が today を含む
      const useGoalCard = makeUseGoalCard({
        useFreezePeriods: vi.fn(() => [
          { startDate: "2026-03-14", endDate: "2026-03-16" },
        ]),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      expect(result.current.isCurrentlyFrozen).toBe(true);
    });

    it("freeze 期間が今日を含まない場合は isCurrentlyFrozen=false", () => {
      // Arrange: freeze period が today より前に終了
      const useGoalCard = makeUseGoalCard({
        useFreezePeriods: vi.fn(() => [
          { startDate: "2026-03-05", endDate: "2026-03-10" },
        ]),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      expect(result.current.isCurrentlyFrozen).toBe(false);
    });

    it("open-ended な freeze period（endDate=null）が今日を含む場合は isCurrentlyFrozen=true", () => {
      // Arrange
      const useGoalCard = makeUseGoalCard({
        useFreezePeriods: vi.fn(() => [
          { startDate: "2026-03-10", endDate: null },
        ]),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      expect(result.current.isCurrentlyFrozen).toBe(true);
    });
  });

  // ─── 4. 完了率 ────────────────────────────────────────────
  describe("完了率: periodLogs にデータがある場合", () => {
    it("completionPercent が正しく計算される", () => {
      // Arrange
      // totalTarget=110, totalActual=55 → completionPercent=50%
      const useGoalCard = makeUseGoalCard({
        usePeriodLogs: vi.fn(() => [
          { date: "2026-03-05", quantity: 10 },
          { date: "2026-03-06", quantity: 10 },
          { date: "2026-03-07", quantity: 10 },
          { date: "2026-03-08", quantity: 10 },
          { date: "2026-03-09", quantity: 15 },
        ]),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      // totalActual=55, totalTarget=110 → 50%
      expect(result.current.balance.totalActual).toBe(55);
      expect(result.current.completionPercent).toBeCloseTo(50, 1);
    });

    it("totalActual が totalTarget を超えても completionPercent は 100 を上限とする", () => {
      // Arrange: 毎日 20 を記録（dailyTarget=10 の2倍）
      const logs = Array.from({ length: 11 }, (_, i) => ({
        date: dayjs(START_10_DAYS_AGO).add(i, "day").format("YYYY-MM-DD"),
        quantity: 20,
      }));
      const useGoalCard = makeUseGoalCard({
        usePeriodLogs: vi.fn(() => logs),
      });

      // Act
      const { result } = renderHook(() => useGoalCard(baseGoal));

      // Assert
      expect(result.current.completionPercent).toBe(100);
    });
  });

  // ─── 5. 非アクティブゴール ───────────────────────────────
  describe("非アクティブゴール: isActive=false", () => {
    it("statusBadge が statusEnded になる", () => {
      // Arrange
      const inactiveGoal: GoalForCard = { ...baseGoal, isActive: false };
      const useGoalCard = makeUseGoalCard();

      // Act
      const { result } = renderHook(() => useGoalCard(inactiveGoal));

      // Assert
      expect(result.current.statusBadge.label).toBe("statusEnded");
    });
  });
});
