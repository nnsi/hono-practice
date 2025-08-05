import { useDeleteGoal, useUpdateGoal } from "@frontend/hooks/api";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNewGoalCard } from "../useNewGoalCard";

// モックの設定
vi.mock("@frontend/hooks/api", () => ({
  useDeleteGoal: vi.fn(),
  useUpdateGoal: vi.fn(),
}));

vi.mock("@frontend/hooks/feature/setting/useAppSettings", () => ({
  useAppSettings: vi.fn(() => ({
    settings: {
      showInactiveDates: true,
    },
  })),
}));

vi.mock("@packages/frontend-shared", () => ({
  calculateDebtBalance: vi.fn((balance) => ({
    label: balance < 0 ? "負債あり" : "貯金あり",
    bgColor: balance < 0 ? "bg-red-50" : "bg-green-50",
    borderColor: balance < 0 ? "border-red-300" : "border-green-300",
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe("useNewGoalCard", () => {
  const mockGoal = {
    id: "goal-1",
    activityId: "activity-1",
    dailyTargetQuantity: 100,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    totalActual: 5000,
    totalTarget: 10000,
    currentBalance: 500,
    inactiveDates: ["2024-01-05", "2024-01-06"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    userId: "user-1",
    isActive: true,
  };

  const mockOnEditEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  it("初期状態が正しく設定される", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    expect(result.current.showDetailModal).toBe(false);
    expect(result.current.showLogCreateDialog).toBe(false);
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.isActive).toBe(true);
    expect(result.current.progressPercentage).toBe(50);
  });

  it("過去の目標の場合isActiveがfalseになる", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd, true),
    );

    expect(result.current.isActive).toBe(false);
  });

  it("handleUpdateが正しく動作する", async () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    act(() => {
      result.current.handleUpdate({ dailyTargetQuantity: 200 });
    });

    expect(mockUpdateGoal.mutate).toHaveBeenCalledWith(
      {
        id: "goal-1",
        data: { dailyTargetQuantity: 200 },
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });

  it("数量が0以下の場合handleUpdateが実行されない", async () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    act(() => {
      result.current.handleUpdate({ dailyTargetQuantity: 0 });
    });

    expect(mockUpdateGoal.mutate).not.toHaveBeenCalled();
  });

  it("handleDeleteが正しく動作する", async () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    act(() => {
      result.current.handleDelete();
    });

    expect(global.confirm).toHaveBeenCalledWith("このゴールを削除しますか？");
    expect(mockDeleteGoal.mutate).toHaveBeenCalledWith("goal-1");
  });

  it("confirmでキャンセルした場合削除されない", async () => {
    global.confirm = vi.fn(() => false);
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    act(() => {
      result.current.handleDelete();
    });

    expect(mockDeleteGoal.mutate).not.toHaveBeenCalled();
  });

  it("handleCardClickでモーダルが開く", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    act(() => {
      result.current.handleCardClick();
    });

    expect(result.current.showDetailModal).toBe(true);
  });

  it("handleLogCreateClickでダイアログが開く", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    const mockEvent = {
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleLogCreateClick(mockEvent);
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.showLogCreateDialog).toBe(true);
  });

  it("handleTargetQuantityChangeが正しく動作する", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    const mockFieldOnChange = vi.fn();
    const mockEvent = {
      target: { value: "300" },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleTargetQuantityChange(mockEvent, mockFieldOnChange);
    });

    expect(mockFieldOnChange).toHaveBeenCalledWith(300);
  });

  it("handleTargetQuantityChangeで空文字の場合", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    const mockFieldOnChange = vi.fn();
    const mockEvent = {
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleTargetQuantityChange(mockEvent, mockFieldOnChange);
    });

    expect(mockFieldOnChange).toHaveBeenCalledWith("");
  });

  it("handleLogCreateSuccessでアニメーションが開始される", async () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    expect(result.current.isAnimating).toBe(false);

    await act(async () => {
      await result.current.handleLogCreateSuccess();
    });

    expect(result.current.isAnimating).toBe(true);

    // タイマーが完了するのを待つ
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });

    expect(result.current.isAnimating).toBe(false);
  });

  it("進捗率が100%を超えない", () => {
    const mockUpdateGoal = { mutate: vi.fn(), isPending: false };
    const mockDeleteGoal = { mutate: vi.fn() };
    vi.mocked(useUpdateGoal).mockReturnValue(mockUpdateGoal as any);
    vi.mocked(useDeleteGoal).mockReturnValue(mockDeleteGoal as any);

    const overAchievedGoal = {
      ...mockGoal,
      totalActual: 15000,
      totalTarget: 10000,
    };

    const { result } = renderHook(() =>
      useNewGoalCard(overAchievedGoal, mockOnEditEnd),
    );

    expect(result.current.progressPercentage).toBe(100);
  });
});
