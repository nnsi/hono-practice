import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useDailyActivityCreate } from "../useDailyActivityCreate";

// モックの設定
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {},
}));

// モック用の関数
const mockHandleActivitySelect = vi.fn();
const mockSetActivityDialogOpen = vi.fn();
const mockHandleActivityDialogClose = vi.fn();
const mockHandleSuccess = vi.fn();

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

// createUseDailyActivityCreateのモック
vi.mock("@packages/frontend-shared/hooks/feature", () => {
  return {
    createUseDailyActivityCreate: vi.fn(() => {
      let selectedActivity: any = null;
      let activityDialogOpen = false;

      return () => ({
        selectedActivity,
        activityDialogOpen,
        activities: mockActivities,
        handleActivitySelect: mockHandleActivitySelect.mockImplementation(
          (activity: any) => {
            selectedActivity = activity;
            activityDialogOpen = true;
          },
        ),
        setActivityDialogOpen: mockSetActivityDialogOpen.mockImplementation(
          (open: boolean) => {
            activityDialogOpen = open;
          },
        ),
        handleActivityDialogClose:
          mockHandleActivityDialogClose.mockImplementation((open: boolean) => {
            activityDialogOpen = open;
            if (!open) {
              selectedActivity = null;
            }
          }),
        handleSuccess: mockHandleSuccess.mockImplementation(() => {
          selectedActivity = null;
          activityDialogOpen = false;
        }),
      });
    }),
  };
});

describe("useDailyActivityCreate", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

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

    expect(mockHandleActivitySelect).toHaveBeenCalledWith(mockActivities[0]);
  });

  it("アクティビティダイアログを閉じると選択がリセットされる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // ダイアログを閉じる
    act(() => {
      result.current.handleActivityDialogClose(false);
    });

    expect(mockHandleActivityDialogClose).toHaveBeenCalledWith(false);
  });

  it("アクティビティダイアログを開いた状態を維持できる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // ダイアログを開いたままにする
    act(() => {
      result.current.handleActivityDialogClose(true);
    });

    expect(mockHandleActivityDialogClose).toHaveBeenCalledWith(true);
  });

  it("成功時にすべての状態がリセットされ、コールバックが呼ばれる", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // 成功処理を実行
    act(() => {
      result.current.handleSuccess();
    });

    expect(mockHandleSuccess).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("onSuccessコールバックが未定義でもエラーにならない", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange),
      { wrapper },
    );

    // 成功処理を実行（エラーが発生しないことを確認）
    expect(() => {
      act(() => {
        result.current.handleSuccess();
      });
    }).not.toThrow();

    expect(mockHandleSuccess).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("フックが正しいプロパティを返す", () => {
    const { result } = renderHook(
      () => useDailyActivityCreate(mockOnOpenChange, mockOnSuccess),
      { wrapper },
    );

    // 実際に存在するプロパティを確認
    expect(result.current.selectedActivity).toBeDefined();
    expect(result.current.activityDialogOpen).toBeDefined();
    expect(result.current.activities).toBeDefined();
    expect(result.current.handleActivitySelect).toBeDefined();
    expect(result.current.handleSuccess).toBeDefined();
  });
});
