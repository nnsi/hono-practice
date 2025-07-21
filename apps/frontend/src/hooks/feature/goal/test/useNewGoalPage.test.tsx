import type React from "react";

import * as apiHooks from "@frontend/hooks/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivitiesResponse, GetGoalsResponse } from "@dtos/response";

import { useNewGoalPage } from "../useNewGoalPage";

// モックの設定
vi.mock("@frontend/hooks/api");
vi.mock("@frontend/utils", () => ({
  apiClient: {
    users: {
      activities: {
        $get: vi.fn(),
      },
    },
  },
}));

describe("useNewGoalPage", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockGoals: GetGoalsResponse = {
    goals: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000101",
        activityId: "00000000-0000-4000-8000-000000000201",
        isActive: true,
        description: "週100回の筋トレ",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        dailyTargetQuantity: 15,
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        currentBalance: 50,
        totalTarget: 100,
        totalActual: 50,
        inactiveDates: [],
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        userId: "00000000-0000-4000-8000-000000000101",
        activityId: "00000000-0000-4000-8000-000000000202",
        isActive: true,
        description: "月200分の読書",
        createdAt: "2024-12-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        dailyTargetQuantity: 7,
        startDate: "2024-12-01",
        endDate: "2024-12-31",
        currentBalance: 180,
        totalTarget: 200,
        totalActual: 180,
        inactiveDates: [],
      },
    ],
  };

  const mockActivities: GetActivitiesResponse = [
    {
      id: "00000000-0000-4000-8000-000000000201",
      name: "筋トレ",
      emoji: "💪",
      quantityUnit: "回",
      kinds: [],
      showCombinedStats: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      name: "読書",
      emoji: "📚",
      quantityUnit: "分",
      kinds: [],
      showCombinedStats: false,
    },
  ];

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useGoalsのモック
    vi.mocked(apiHooks.useGoals).mockReturnValue({
      data: mockGoals,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      isSuccess: true,
    } as any);

    // apiClientのモック
    const { apiClient: mockedApiClient } = await import("@frontend/utils");
    vi.mocked(mockedApiClient.users.activities.$get).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivities),
    } as any);
  });

  it("初期状態が正しく設定される", () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    expect(result.current.editingGoalId).toBeNull();
    expect(result.current.createDialogOpen).toBe(false);
    expect(result.current.goalsLoading).toBe(false);
  });

  it("目標データが正しく取得される", () => {
    // 日付を固定（2025-01-20として扱う）
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20"));

    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    expect(result.current.currentGoals).toHaveLength(1);
    expect(result.current.pastGoals).toHaveLength(1);
    expect(result.current.currentGoals[0].id).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(result.current.pastGoals[0].id).toBe(
      "00000000-0000-4000-8000-000000000002",
    );

    vi.useRealTimers();
  });

  it("アクティビティデータが正しく取得される", async () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toEqual(mockActivities);
    });
  });

  it("getActivityNameが正しくアクティビティ名を返す", async () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toBeDefined();
    });

    expect(
      result.current.getActivityName("00000000-0000-4000-8000-000000000201"),
    ).toBe("筋トレ");
    expect(
      result.current.getActivityName("00000000-0000-4000-8000-000000000202"),
    ).toBe("読書");
    expect(result.current.getActivityName("unknown-id")).toBe(
      "不明なアクティビティ",
    );
  });

  it("getActivityEmojiが正しく絵文字を返す", async () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toBeDefined();
    });

    expect(
      result.current.getActivityEmoji("00000000-0000-4000-8000-000000000201"),
    ).toBe("💪");
    expect(
      result.current.getActivityEmoji("00000000-0000-4000-8000-000000000202"),
    ).toBe("📚");
    expect(result.current.getActivityEmoji("unknown-id")).toBe("🎯");
  });

  it("getActivityUnitが正しく単位を返す", async () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toBeDefined();
    });

    expect(
      result.current.getActivityUnit("00000000-0000-4000-8000-000000000201"),
    ).toBe("回");
    expect(
      result.current.getActivityUnit("00000000-0000-4000-8000-000000000202"),
    ).toBe("分");
    expect(result.current.getActivityUnit("unknown-id")).toBe("");
  });

  it("getActivityが正しくアクティビティオブジェクトを返す", async () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toBeDefined();
    });

    expect(
      result.current.getActivity("00000000-0000-4000-8000-000000000201"),
    ).toEqual(mockActivities[0]);
    expect(result.current.getActivity("unknown-id")).toBeUndefined();
  });

  it("createEditStartHandlerが編集IDを設定する", () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    const editHandler = result.current.createEditStartHandler(
      "00000000-0000-4000-8000-000000000001",
    );

    act(() => {
      editHandler();
    });

    expect(result.current.editingGoalId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("handleEditEndが編集IDをクリアする", () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    // 最初に編集IDを設定
    act(() => {
      const editHandler = result.current.createEditStartHandler(
        "00000000-0000-4000-8000-000000000001",
      );
      editHandler();
    });

    expect(result.current.editingGoalId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );

    // 編集を終了
    act(() => {
      result.current.handleEditEnd();
    });

    expect(result.current.editingGoalId).toBeNull();
  });

  it("handleGoalCreatedが状態をリセットする", () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    // 最初に状態を設定
    act(() => {
      result.current.setCreateDialogOpen(true);
      const editHandler = result.current.createEditStartHandler(
        "00000000-0000-4000-8000-000000000001",
      );
      editHandler();
    });

    expect(result.current.createDialogOpen).toBe(true);
    expect(result.current.editingGoalId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );

    // 目標作成完了
    act(() => {
      result.current.handleGoalCreated();
    });

    expect(result.current.editingGoalId).toBeNull();
    expect(result.current.createDialogOpen).toBe(false);
  });

  it("setCreateDialogOpenが作成ダイアログの状態を制御する", () => {
    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    act(() => {
      result.current.setCreateDialogOpen(true);
    });

    expect(result.current.createDialogOpen).toBe(true);

    act(() => {
      result.current.setCreateDialogOpen(false);
    });

    expect(result.current.createDialogOpen).toBe(false);
  });

  it("期間終了日がない目標は現在の目標として扱われる", () => {
    const goalsWithNoEndDate = {
      goals: [
        {
          ...mockGoals.goals[0],
          endDate: null,
        },
      ],
    };

    vi.mocked(apiHooks.useGoals).mockReturnValue({
      data: goalsWithNoEndDate,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      isSuccess: true,
    } as any);

    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    expect(result.current.currentGoals).toHaveLength(1);
    expect(result.current.pastGoals).toHaveLength(0);
  });

  it("今日が期間終了日の目標は現在の目標として扱われる", () => {
    // 日付を固定
    vi.useFakeTimers();
    const today = new Date("2025-01-20");
    vi.setSystemTime(today);
    const todayString = today.toISOString().split("T")[0];

    const goalsEndingToday = {
      goals: [
        {
          ...mockGoals.goals[0],
          endDate: todayString,
        },
      ],
    };

    vi.mocked(apiHooks.useGoals).mockReturnValue({
      data: goalsEndingToday,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      isSuccess: true,
    } as any);

    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    expect(result.current.currentGoals).toHaveLength(1);
    expect(result.current.pastGoals).toHaveLength(0);

    vi.useRealTimers();
  });

  it("ローディング中はgoalsLoadingがtrueになる", () => {
    vi.mocked(apiHooks.useGoals).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isFetching: true,
      isSuccess: false,
    } as any);

    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    expect(result.current.goalsLoading).toBe(true);
    expect(result.current.currentGoals).toEqual([]);
    expect(result.current.pastGoals).toEqual([]);
  });

  it("アクティビティデータがない場合でもエラーにならない", async () => {
    const { apiClient: mockedApiClient } = await import("@frontend/utils");
    vi.mocked(mockedApiClient.users.activities.$get).mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    } as any);

    const { result } = renderHook(() => useNewGoalPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.activitiesData).toEqual([]);
    });

    expect(result.current.getActivityName("any-id")).toBe(
      "不明なアクティビティ",
    );
    expect(result.current.getActivityEmoji("any-id")).toBe("🎯");
    expect(result.current.getActivityUnit("any-id")).toBe("");
  });
});
