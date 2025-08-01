import { useActivities, useGoal, useGoalStats } from "@frontend/hooks/api";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGoalDetailModal } from "../useGoalDetailModal";

// モックの設定
vi.mock("@frontend/hooks/api", () => ({
  useGoal: vi.fn(),
  useGoalStats: vi.fn(),
  useActivities: vi.fn(),
}));

describe("useGoalDetailModal", () => {
  const mockGoal = {
    id: "goal-1",
    activityId: "activity-1",
    dailyTargetQuantity: 100,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    totalActual: 5000,
    totalTarget: 10000,
    currentBalance: 500,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    userId: "user-1",
    isActive: true,
    inactiveDates: [],
  };

  const mockActivity = {
    id: "activity-1",
    name: "ランニング",
    emoji: "🏃",
    quantityUnit: "m",
    iconType: "emoji" as const,
  };

  const mockStatsData = {
    stats: {
      max: 500,
      maxConsecutiveDays: 10,
      achievedDays: 50,
    },
    dailyRecords: [
      { date: "2024-01-01", quantity: 100 },
      { date: "2024-01-02", quantity: 200 },
      { date: "2024-01-03", quantity: 0 },
      { date: "2024-01-04", quantity: 150 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しく目標データを取得できる", async () => {
    vi.mocked(useGoal).mockReturnValue({
      data: mockGoal,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [mockActivity],
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.goal).toEqual(mockGoal);
      expect(result.current.activity).toEqual(mockActivity);
      expect(result.current.activityName).toBe("ランニング");
      expect(result.current.activityEmoji).toBe("🏃");
      expect(result.current.quantityUnit).toBe("m");
    });
  });

  it("統計情報を正しく計算できる", async () => {
    vi.mocked(useGoal).mockReturnValue({
      data: mockGoal,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [mockActivity],
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.stats.currentProgress).toBe(5000);
      expect(result.current.stats.targetProgress).toBe(10000);
      expect(result.current.stats.progressPercentage).toBe(50);
      expect(result.current.stats.activeDays).toBe(3); // quantity > 0の日数
      expect(result.current.stats.maxDaily).toBe(500);
      expect(result.current.stats.maxConsecutiveDays).toBe(10);
      expect(result.current.stats.daysAchieved).toBe(50);
      // daysUntilDeadlineは日付に依存するので存在確認のみ
      if (result.current.stats.daysUntilDeadline !== undefined) {
        expect(typeof result.current.stats.daysUntilDeadline).toBe("number");
      }
    });
  });

  it("過去の目標を正しく判定できる", async () => {
    const pastGoal = {
      ...mockGoal,
      endDate: "2020-12-31", // 過去の日付
    };

    vi.mocked(useGoal).mockReturnValue({
      data: pastGoal,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [mockActivity],
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.isPastGoal).toBe(true);
    });
  });

  it("アクティビティが見つからない場合のデフォルト値", async () => {
    vi.mocked(useGoal).mockReturnValue({
      data: mockGoal,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [], // 空の配列
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.activityName).toBe("不明なアクティビティ");
      expect(result.current.activityEmoji).toBe("🎯");
      expect(result.current.quantityUnit).toBe("");
    });
  });

  it("目標データがない場合の処理", async () => {
    vi.mocked(useGoal).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.goal).toBe(null);
      expect(result.current.stats).toEqual({
        currentProgress: 0,
        targetProgress: 0,
        progressPercentage: 0,
        activeDays: 0,
        maxDaily: 0,
        maxConsecutiveDays: 0,
        daysAchieved: 0,
      });
    });
  });

  it("統計データロード中の処理", async () => {
    vi.mocked(useGoal).mockReturnValue({
      data: mockGoal,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useGoalStats).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(useActivities).mockReturnValue({
      data: [mockActivity],
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
      // 基本的な統計情報のみ取得できる
      expect(result.current.stats.currentProgress).toBe(5000);
      expect(result.current.stats.targetProgress).toBe(10000);
      expect(result.current.stats.progressPercentage).toBe(50);
    });
  });
});
