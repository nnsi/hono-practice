import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "@components/ui";

import { useNewGoalDialog } from "../useNewGoalDialog";

// モックの設定
let mockCreateGoal = { mutate: vi.fn(), isPending: false };

vi.mock("@packages/frontend-shared/hooks", () => ({
  createUseCreateGoal: vi.fn(() => mockCreateGoal),
}));

// react-hook-formのモック
let mockForm = {
  watch: vi.fn(() => ""),
  setValue: vi.fn(),
  getValues: vi.fn(() => ({
    activityId: "",
    dailyTargetQuantity: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  })),
  reset: vi.fn(),
};

vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock("@components/ui", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe("useNewGoalDialog", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockActivities = [
    {
      id: "activity-1",
      name: "ランニング",
      emoji: "🏃",
      quantityUnit: "km",
      iconType: "emoji" as const,
      kinds: [],
      showCombinedStats: false,
    },
    {
      id: "activity-2",
      name: "読書",
      emoji: "📚",
      quantityUnit: "ページ",
      iconType: "emoji" as const,
      kinds: [],
      showCombinedStats: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGoal = { mutate: vi.fn(), isPending: false };
    mockForm = {
      watch: vi.fn(() => ""),
      setValue: vi.fn(),
      getValues: vi.fn(() => ({
        activityId: "",
        dailyTargetQuantity: 1,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      })),
      reset: vi.fn(),
    };
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("初期状態が正しく設定される", () => {
    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    const formValues = result.current.form.getValues();
    expect(formValues.dailyTargetQuantity).toBe(1);
    expect(formValues.startDate).toBe(new Date().toISOString().split("T")[0]);
    expect(formValues.endDate).toBe("");
  });

  it("活動が選択されたときに単位が更新される", async () => {
    // mockForm.watchが"activity-1"を返すように設定
    mockForm.watch = vi.fn(() => "activity-1");

    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    act(() => {
      result.current.form.setValue("activityId", "activity-1");
    });

    await waitFor(() => {
      expect(result.current.selectedActivity).toEqual(mockActivities[0]);
      expect(result.current.quantityUnit).toBe("km");
    });
  });

  it("handleSubmitが正常に動作する", async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);

    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    const formData = {
      activityId: "activity-1",
      dailyTargetQuantity: 5,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    expect(mockCreateGoal.mutate).toHaveBeenCalledWith(
      {
        activityId: "activity-1",
        dailyTargetQuantity: 5,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
      {
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      },
    );
  });

  it("目標作成成功時の処理が正しく動作する", async () => {
    const mockToast = vi.fn();
    const mockReset = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);

    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    // form.resetをモック
    result.current.form.reset = mockReset;

    const formData = {
      activityId: "activity-1",
      dailyTargetQuantity: 5,
      startDate: "2024-01-01",
      endDate: "",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    // onSuccessコールバックを実行
    const onSuccessCallback = mockCreateGoal.mutate.mock.calls[0][1].onSuccess;
    act(() => {
      onSuccessCallback();
    });

    expect(mockReset).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "目標を作成しました",
      description: "新しい目標が追加されました",
    });
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("目標作成失敗時の処理が正しく動作する", async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);

    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    const formData = {
      activityId: "activity-1",
      dailyTargetQuantity: 5,
      startDate: "2024-01-01",
      endDate: "",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    // onErrorコールバックを実行
    const onErrorCallback = mockCreateGoal.mutate.mock.calls[0][1].onError;
    act(() => {
      onErrorCallback();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "目標の作成に失敗しました",
      variant: "destructive",
    });
  });

  it("endDateが空の場合undefinedとして送信される", async () => {
    const { result } = renderHook(
      () => useNewGoalDialog(mockOnOpenChange, mockActivities, mockOnSuccess),
      { wrapper },
    );

    const formData = {
      activityId: "activity-2",
      dailyTargetQuantity: 10,
      startDate: "2024-01-01",
      endDate: "",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    expect(mockCreateGoal.mutate).toHaveBeenCalledWith(
      {
        activityId: "activity-2",
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: undefined,
      },
      expect.any(Object),
    );
  });
});
