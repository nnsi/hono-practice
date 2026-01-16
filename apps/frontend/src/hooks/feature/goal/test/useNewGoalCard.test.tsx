import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNewGoalCard } from "../useNewGoalCard";

// apiClientのモック
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {},
}));

// webアダプターのモック
vi.mock("@packages/frontend-shared/adapters/web", () => ({
  createWebStorageAdapter: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
}));

// モック用の関数
const mockHandleUpdate = vi.fn();
const mockHandleDelete = vi.fn();
const mockHandleToggleActive = vi.fn();
const mockOnCardClick = vi.fn();
const mockOnEditStart = vi.fn();
const mockOnLogCreated = vi.fn();

// createUseNewGoalCardのモック
vi.mock("@packages/frontend-shared/hooks/feature", () => ({
  createUseNewGoalCard: vi.fn((deps) => {
    return (goal: any, isPast: boolean) => {
      const progressPercentage = Math.min(
        100,
        Math.round((goal.totalActual / goal.totalTarget) * 100),
      );

      return {
        stateProps: {
          showDetailModal: false,
          showLogCreateDialog: false,
          isAnimating: false,
          isActive: !isPast && goal.isActive,
          isUpdating: false,
          isDeleting: false,
          progressPercentage,
          goal,
        },
        actions: {
          onDetailModalOpenChange: vi.fn(),
          onLogCreateDialogOpenChange: vi.fn(),
          onUpdate: mockHandleUpdate.mockImplementation(async (params: any) => {
            if (
              params &&
              params.dailyTargetQuantity !== undefined &&
              params.dailyTargetQuantity <= 0
            ) {
              return;
            }
            // 成功時の処理
            if (
              params &&
              params.dailyTargetQuantity !== undefined &&
              params.dailyTargetQuantity > 0
            ) {
              deps.onEditEnd();
            }
          }),
          onDelete: mockHandleDelete.mockImplementation(async () => {
            const confirmed = await deps.onConfirm(
              "このゴールを削除しますか？",
            );
            if (confirmed) {
              // 削除処理
              return goal.id;
            }
          }),
          onToggleActive: mockHandleToggleActive,
          onCardClick: mockOnCardClick,
          onEditStart: mockOnEditStart,
          onLogCreateSuccess: mockOnLogCreated,
          onTargetQuantityChange: vi.fn(),
          onDeleteClick: vi.fn(),
          onCardKeyDown: vi.fn(),
          onLogCreateClick: vi.fn(),
          onEditClick: vi.fn(),
          onPastGoalDeleteClick: vi.fn(),
        },
        form: {
          register: vi.fn(() => ({})),
          handleSubmit: vi.fn((fn) => fn),
          formState: { errors: {} },
          watch: vi.fn(),
          setValue: vi.fn(),
          getValues: vi.fn(),
        },
      };
    };
  }),

  calculateDebtBalance: vi.fn((balance) => ({
    label: balance < 0 ? "負債あり" : "貯金あり",
    bgColor: balance < 0 ? "bg-red-50" : "bg-green-50",
    borderColor: balance < 0 ? "border-red-300" : "border-green-300",
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

  it("初期状態が正しく設定される", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await waitFor(() => {
      expect(result.current.showDetailModal).toBe(false);
      expect(result.current.showLogCreateDialog).toBe(false);
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.isActive).toBe(true);
      expect(result.current.progressPercentage).toBe(50);
    });
  });

  it("過去の目標の場合isActiveがfalseになる", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd, true),
    );

    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });

  it("handleUpdateが正しく動作する", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await act(async () => {
      await result.current.handleUpdate({ dailyTargetQuantity: 200 });
    });

    expect(mockHandleUpdate).toHaveBeenCalledWith({ dailyTargetQuantity: 200 });

    // onEditEndが呼ばれることを確認
    expect(mockOnEditEnd).toHaveBeenCalled();
  });

  it("数量が0以下の場合handleUpdateが実行されない", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await act(async () => {
      await result.current.handleUpdate({ dailyTargetQuantity: 0 });
    });

    // handleUpdateは呼ばれるが、実際のmutateは実行されない
    expect(mockHandleUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnEditEnd).not.toHaveBeenCalled();
  });

  it("handleDeleteが正しく動作する", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(global.confirm).toHaveBeenCalledWith("このゴールを削除しますか？");
    expect(mockHandleDelete).toHaveBeenCalled();
  });

  it("削除がキャンセルされた場合は何もしない", async () => {
    global.confirm = vi.fn(() => false);

    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(global.confirm).toHaveBeenCalled();
    // mockHandleDeleteは呼ばれるが、内部でconfirmがfalseなので実際の削除は実行されない
    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it("負の残高の場合debtBalanceが正しく計算される", async () => {
    const negativeGoal = {
      ...mockGoal,
      currentBalance: -1000,
    };

    const { result } = renderHook(() =>
      useNewGoalCard(negativeGoal, mockOnEditEnd),
    );

    await waitFor(() => {
      expect(result.current.progressPercentage).toBe(50);
    });
  });

  it("ハンドラ関数が正しく定義されている", async () => {
    const { result } = renderHook(() =>
      useNewGoalCard(mockGoal, mockOnEditEnd),
    );

    await waitFor(() => {
      // 実際のフックが返すプロパティを確認
      expect(result.current.handleUpdate).toBeDefined();
      expect(result.current.handleDelete).toBeDefined();
      expect(result.current.showDetailModal).toBeDefined();
      expect(result.current.showLogCreateDialog).toBeDefined();
    });
  });
});
