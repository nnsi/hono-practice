import type React from "react";

import * as apiHooks from "@frontend/hooks/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useDailyActivityCreate } from "../useDailyActivityCreate";

// モックの設定
vi.mock("@frontend/hooks/api");

describe("useDailyActivityCreate", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockActivities: GetActivityResponse[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Running",
      emoji: "🏃",
      iconType: "emoji",
      quantityUnit: "km",
      kinds: [],
      showCombinedStats: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Reading",
      emoji: "📚",
      iconType: "emoji",
      quantityUnit: "pages",
      kinds: [
        {
          id: "00000000-0000-4000-8000-000000000101",
          name: "Fiction",
        },
        {
          id: "00000000-0000-4000-8000-000000000102",
          name: "Non-fiction",
        },
      ],
      showCombinedStats: false,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useActivitiesのモック
    vi.mocked(apiHooks.useActivities).mockReturnValue({
      data: mockActivities,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPlaceholderData: false,
      isPending: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      status: "success",
      fetchStatus: "idle",
      isInitialLoading: false,
      isLoadingError: false,
    } as any);
  });

  it("初期状態が正しく設定される", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    expect(result.current.selectedActivity).toBeNull();
    expect(result.current.activityDialogOpen).toBe(false);
    expect(result.current.activities).toEqual(mockActivities);
  });

  it("アクティビティを選択するとダイアログが開く", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    act(() => {
      result.current.handleActivitySelect(mockActivities[0]);
    });

    expect(result.current.selectedActivity).toEqual(mockActivities[0]);
    expect(result.current.activityDialogOpen).toBe(true);
  });

  it("アクティビティダイアログを閉じると選択がリセットされる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // まずアクティビティを選択
    act(() => {
      result.current.handleActivitySelect(mockActivities[1]);
    });

    expect(result.current.selectedActivity).toEqual(mockActivities[1]);
    expect(result.current.activityDialogOpen).toBe(true);

    // ダイアログを閉じる
    act(() => {
      result.current.handleActivityDialogClose(false);
    });

    expect(result.current.selectedActivity).toBeNull();
    expect(result.current.activityDialogOpen).toBe(false);
  });

  it("アクティビティダイアログを開いた状態を維持できる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    act(() => {
      result.current.handleActivitySelect(mockActivities[0]);
    });

    // ダイアログを開いたままにする
    act(() => {
      result.current.handleActivityDialogClose(true);
    });

    expect(result.current.selectedActivity).toEqual(mockActivities[0]);
    expect(result.current.activityDialogOpen).toBe(true);
  });

  it("成功時にすべての状態がリセットされ、コールバックが呼ばれる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // アクティビティを選択
    act(() => {
      result.current.handleActivitySelect(mockActivities[0]);
    });

    // 成功処理を実行
    act(() => {
      result.current.handleSuccess();
    });

    expect(result.current.selectedActivity).toBeNull();
    expect(result.current.activityDialogOpen).toBe(false);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("onSuccessコールバックが未定義でもエラーにならない", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange),
      { wrapper },
    );

    // アクティビティを選択
    act(() => {
      result.current.handleActivitySelect(mockActivities[1]);
    });

    // 成功処理を実行（エラーが発生しないことを確認）
    expect(() => {
      act(() => {
        result.current.handleSuccess();
      });
    }).not.toThrow();

    expect(result.current.selectedActivity).toBeNull();
    expect(result.current.activityDialogOpen).toBe(false);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("複数のアクティビティを順番に選択できる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // 最初のアクティビティを選択
    act(() => {
      result.current.handleActivitySelect(mockActivities[0]);
    });

    expect(result.current.selectedActivity).toEqual(mockActivities[0]);

    // 別のアクティビティを選択（ダイアログは開いたまま）
    act(() => {
      result.current.handleActivitySelect(mockActivities[1]);
    });

    expect(result.current.selectedActivity).toEqual(mockActivities[1]);
    expect(result.current.activityDialogOpen).toBe(true);
  });

  it("アクティビティがない場合でもエラーにならない", () => {
    vi.mocked(apiHooks.useActivities).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    expect(result.current.activities).toBeUndefined();
    expect(result.current.selectedActivity).toBeNull();
    expect(result.current.activityDialogOpen).toBe(false);
  });
});
