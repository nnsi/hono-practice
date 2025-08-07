import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGoalDetailModal } from "../useGoalDetailModal";

// apiClientのモック
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {},
}));

// モックデータ
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
  ],
};

// モック用の関数
const mockUseGoal = vi.fn();
const mockUseGoalStats = vi.fn();
const mockUseActivities = vi.fn();

// APIフックのモック
vi.mock("@frontend/hooks/api/useGoals", () => ({
  useGoal: () => mockUseGoal(),
  useGoalStats: () => mockUseGoalStats(),
}));

vi.mock("@frontend/hooks/api/useActivities", () => ({
  useActivities: () => mockUseActivities(),
}));

// createUseGoalDetailModalのモック
vi.mock("@packages/frontend-shared/hooks/feature", () => ({
  createUseGoalDetailModal: vi.fn(() => {
    return (_goalId: string, open: boolean) => {
      if (!open) {
        return {
          goal: null,
          isLoading: false,
          activity: null,
          activityName: "不明なアクティビティ",
          activityEmoji: "🎯",
          quantityUnit: "",
          stats: {
            currentProgress: 0,
            targetProgress: 0,
            progressPercentage: 0,
            activeDays: 0,
            maxDaily: 0,
            maxConsecutiveDays: 0,
            daysAchieved: 0,
            daysUntilDeadline: undefined,
          },
          isPastGoal: false,
        };
      }

      const goalData = mockUseGoal();
      const statsData = mockUseGoalStats();
      const activitiesData = mockUseActivities();

      const goal = goalData?.data || null;
      const activity = activitiesData?.data?.find(
        (a: any) => a.id === goal?.activityId,
      );
      const stats = statsData?.data;

      const isPastGoal = goal?.endDate
        ? new Date(goal.endDate) < new Date()
        : false;

      return {
        goal,
        isLoading:
          goalData?.isLoading ||
          statsData?.isLoading ||
          activitiesData?.isLoading,
        activity,
        activityName: activity?.name || "不明なアクティビティ",
        activityEmoji: activity?.emoji || "🎯",
        quantityUnit: activity?.quantityUnit || "",
        stats: {
          currentProgress: goal?.totalActual || 0,
          targetProgress: goal?.totalTarget || 0,
          progressPercentage: goal
            ? Math.min(
                100,
                Math.round((goal.totalActual / goal.totalTarget) * 100),
              )
            : 0,
          activeDays:
            stats?.dailyRecords?.filter((r: any) => r.quantity > 0).length || 0,
          maxDaily: stats?.stats?.max || 0,
          maxConsecutiveDays: stats?.stats?.maxConsecutiveDays || 0,
          daysAchieved: stats?.stats?.achievedDays || 0,
          daysUntilDeadline: goal?.endDate
            ? Math.ceil(
                (new Date(goal.endDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : undefined,
        },
        isPastGoal,
      };
    };
  }),
}));

describe("useGoalDetailModal", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it("正しく目標データを取得できる", async () => {
    mockUseGoal.mockReturnValue({
      data: mockGoal,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
    });

    mockUseActivities.mockReturnValue({
      data: [mockActivity],
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.goal).toEqual(mockGoal);
      expect(result.current.activity).toEqual(mockActivity);
      expect(result.current.activityName).toBe("ランニング");
      expect(result.current.activityEmoji).toBe("🏃");
      expect(result.current.quantityUnit).toBe("m");
    });
  });

  it("統計情報を正しく計算できる", async () => {
    mockUseGoal.mockReturnValue({
      data: mockGoal,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
    });

    mockUseActivities.mockReturnValue({
      data: [mockActivity],
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.stats.currentProgress).toBe(5000);
      expect(result.current.stats.targetProgress).toBe(10000);
      expect(result.current.stats.progressPercentage).toBe(50);
      expect(result.current.stats.activeDays).toBe(2);
      expect(result.current.stats.maxDaily).toBe(500);
      expect(result.current.stats.maxConsecutiveDays).toBe(10);
      expect(result.current.stats.daysAchieved).toBe(50);
    });
  });

  it("過去の目標を正しく判定できる", async () => {
    const pastGoal = {
      ...mockGoal,
      endDate: "2020-12-31", // 過去の日付
    };

    mockUseGoal.mockReturnValue({
      data: pastGoal,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
    });

    mockUseActivities.mockReturnValue({
      data: [mockActivity],
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isPastGoal).toBe(true);
    });
  });

  it("アクティビティが見つからない場合のデフォルト値", async () => {
    mockUseGoal.mockReturnValue({
      data: mockGoal,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
    });

    mockUseActivities.mockReturnValue({
      data: [], // 空の配列
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.activity).toBeUndefined();
      expect(result.current.activityName).toBe("不明なアクティビティ");
      expect(result.current.activityEmoji).toBe("🎯");
      expect(result.current.quantityUnit).toBe("");
    });
  });

  it("目標データがない場合の処理", async () => {
    mockUseGoal.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseActivities.mockReturnValue({
      data: [mockActivity],
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.goal).toBeNull();
      expect(result.current.stats.currentProgress).toBe(0);
      expect(result.current.stats.targetProgress).toBe(0);
      expect(result.current.stats.progressPercentage).toBe(0);
    });
  });

  it("統計データロード中の処理", async () => {
    mockUseGoal.mockReturnValue({
      data: mockGoal,
      isLoading: false,
    });

    mockUseGoalStats.mockReturnValue({
      data: null,
      isLoading: true,
    });

    mockUseActivities.mockReturnValue({
      data: [mockActivity],
      isLoading: false,
    });

    const { result } = renderHook(() => useGoalDetailModal("goal-1", true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
  });

  it("openがfalseの場合はデータを取得しない", async () => {
    const { result } = renderHook(() => useGoalDetailModal("goal-1", false), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.goal).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.activityName).toBe("不明なアクティビティ");
    });
  });
});
