import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTaskCreateDialogHarness } from "./useTaskCreateDialog.harness";

describe("useTaskCreateDialog（通常作成）", () => {
  const {
    createTask,
    createTaskSchedule,
    syncTasks,
    syncTaskSchedules,
    onSuccess,
    useTaskCreateDialog,
  } = createTaskCreateDialogHarness();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () =>
    renderHook(() => useTaskCreateDialog(onSuccess, "2026-09-10"));

  it("繰り返しなしなら従来通り createTask + syncTasks を呼ぶ", async () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("  買い物  ");
      result.current.setDueDate("2026-09-12");
    });
    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createTask).toHaveBeenCalledWith({
      title: "買い物",
      activityId: null,
      activityKindId: null,
      quantity: null,
      startDate: "2026-09-10",
      dueDate: "2026-09-12",
      memo: "",
    });
    expect(createTaskSchedule).not.toHaveBeenCalled();
    expect(syncTasks).toHaveBeenCalledTimes(1);
    expect(syncTaskSchedules).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("タイトルが空なら submit 不可で何も呼ばない", async () => {
    const { result } = setup();
    expect(result.current.canSubmit).toBe(false);
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createTask).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("タイトルが 21 文字なら submit 不可（20 文字なら可）", async () => {
    const { result } = setup();
    act(() => result.current.setTitle("あ".repeat(21)));
    expect(result.current.canSubmit).toBe(false);
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createTask).not.toHaveBeenCalled();

    act(() => result.current.setTitle("あ".repeat(20)));
    expect(result.current.canSubmit).toBe(true);
  });

  it("繰り返しなしなら数量・メモの schedule 境界は見ない（Task 側の schema に任せる）", () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("買い物");
      result.current.setQuantity(1000000);
      result.current.setMemo("あ".repeat(1001));
    });
    expect(result.current.canSubmit).toBe(true);
  });
});
