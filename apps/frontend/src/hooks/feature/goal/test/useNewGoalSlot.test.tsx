import { useCreateGoal } from "@frontend/hooks/api";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNewGoalSlot } from "../useNewGoalSlot";

// モックの設定
vi.mock("@frontend/hooks/api", () => ({
  useCreateGoal: vi.fn(),
}));

describe("useNewGoalSlot", () => {
  const mockOnCreated = vi.fn();
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
  });

  it("初期状態が正しく設定される", () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    expect(result.current.isCreating).toBe(false);
    const formValues = result.current.form.getValues();
    expect(formValues.dailyTargetQuantity).toBe(1);
    expect(formValues.startDate).toBe(new Date().toISOString().split("T")[0]);
    expect(formValues.endDate).toBe("");
  });

  it("handleStartCreatingで作成モードになる", () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    act(() => {
      result.current.handleStartCreating();
    });

    expect(result.current.isCreating).toBe(true);
  });

  it("活動が選択されたときに単位が更新される", async () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    act(() => {
      result.current.form.setValue("activityId", "activity-2");
    });

    await waitFor(() => {
      expect(result.current.selectedActivity).toEqual(mockActivities[1]);
      expect(result.current.quantityUnit).toBe("ページ");
    });
  });

  it("handleSubmitが正常に動作する", async () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    const formData = {
      activityId: "activity-1",
      dailyTargetQuantity: 10,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    expect(mockCreateGoal.mutate).toHaveBeenCalledWith(
      {
        activityId: "activity-1",
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });

  it("数量が0以下の場合handleSubmitが実行されない", async () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    const formData = {
      activityId: "activity-1",
      dailyTargetQuantity: 0,
      startDate: "2024-01-01",
      endDate: "",
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    expect(mockCreateGoal.mutate).not.toHaveBeenCalled();
  });

  it("目標作成成功時の処理が正しく動作する", async () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    const mockReset = vi.fn();
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    // form.resetをモック
    result.current.form.reset = mockReset;

    // 作成モードにする
    act(() => {
      result.current.handleStartCreating();
    });

    expect(result.current.isCreating).toBe(true);

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

    expect(result.current.isCreating).toBe(false);
    expect(mockReset).toHaveBeenCalled();
    expect(mockOnCreated).toHaveBeenCalled();
  });

  it("handleCancelで作成がキャンセルされる", () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    const mockReset = vi.fn();
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    // form.resetをモック
    result.current.form.reset = mockReset;

    // 作成モードにする
    act(() => {
      result.current.handleStartCreating();
    });

    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.handleCancel();
    });

    expect(result.current.isCreating).toBe(false);
    expect(mockReset).toHaveBeenCalled();
  });

  it("handleActivityChangeでフォーカスが移動する", async () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    const mockFieldOnChange = vi.fn();
    const mockInput = {
      focus: vi.fn(),
      select: vi.fn(),
    };
    document.querySelector = vi.fn().mockReturnValue(mockInput);

    act(() => {
      result.current.handleActivityChange("activity-1", mockFieldOnChange);
    });

    expect(mockFieldOnChange).toHaveBeenCalledWith("activity-1");

    // setTimeoutが完了するのを待つ
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(document.querySelector).toHaveBeenCalledWith(
      'input[name="dailyTargetQuantity"]',
    );
    expect(mockInput.focus).toHaveBeenCalled();
    expect(mockInput.select).toHaveBeenCalled();
  });

  it("handleTargetQuantityChangeが正しく動作する", () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
    );

    const mockFieldOnChange = vi.fn();
    const mockEvent = {
      target: { value: "20" },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleTargetQuantityChange(mockEvent, mockFieldOnChange);
    });

    expect(mockFieldOnChange).toHaveBeenCalledWith(20);
  });

  it("handleTargetQuantityChangeで空文字の場合", () => {
    const mockCreateGoal = { mutate: vi.fn(), isPending: false };
    vi.mocked(useCreateGoal).mockReturnValue(mockCreateGoal as any);

    const { result } = renderHook(() =>
      useNewGoalSlot(mockActivities, mockOnCreated),
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
});
