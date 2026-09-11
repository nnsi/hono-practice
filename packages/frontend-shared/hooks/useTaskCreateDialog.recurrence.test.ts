import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTaskCreateDialogHarness } from "./useTaskCreateDialog.harness";

describe("useTaskCreateDialog（繰り返し）", () => {
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

  it("x日ごとなら createTaskSchedule(interval) + syncTaskSchedules を呼び、Task は作らない", async () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setActivityId("act-1");
      result.current.setQuantity(10);
      result.current.setRecurrenceType("interval");
      result.current.setIntervalDays(3);
      result.current.setDueDate("2026-12-31");
    });
    expect(result.current.isRecurring).toBe(true);
    expect(result.current.recurrenceError).toBeNull();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createTaskSchedule).toHaveBeenCalledWith({
      title: "筋トレ",
      activityId: "act-1",
      activityKindId: null,
      quantity: 10,
      memo: "",
      startDate: "2026-09-10",
      endDate: "2026-12-31",
      isActive: true,
      recurrenceType: "interval",
      intervalDays: 3,
      weekdays: null,
    });
    expect(createTask).not.toHaveBeenCalled();
    expect(syncTaskSchedules).toHaveBeenCalledTimes(1);
    expect(syncTasks).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("曜日指定なら weekdays をソート済みで渡し、終了日未設定は null になる", async () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("ランニング");
      result.current.setRecurrenceType("weekdays");
    });
    act(() => {
      for (const day of [5, 1, 3]) result.current.toggleWeekday(day);
    });
    expect(result.current.weekdays).toEqual([1, 3, 5]);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createTaskSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrenceType: "weekdays",
        weekdays: [1, 3, 5],
        intervalDays: null,
        endDate: null,
      }),
    );
  });

  it("曜日トグルは同じ曜日をもう一度押すと外れる", () => {
    const { result } = setup();
    act(() => result.current.setRecurrenceType("weekdays"));
    act(() => result.current.toggleWeekday(2));
    act(() => result.current.toggleWeekday(2));
    expect(result.current.weekdays).toEqual([]);
    expect(result.current.recurrenceError).toBe("weekdays");
    expect(result.current.canSubmit).toBe(false);
  });

  it.each([
    ["0", 0],
    ["小数", 1.5],
    ["負数", -2],
  ])("日数が %s なら intervalDays エラーで submit 不可", async (_, days) => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setRecurrenceType("interval");
      result.current.setIntervalDays(days);
    });
    expect(result.current.recurrenceError).toBe("intervalDays");
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createTaskSchedule).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("終了日が開始日より前なら endDate エラー。開始日と同日は OK", () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setRecurrenceType("interval");
      result.current.setDueDate("2026-09-09");
    });
    expect(result.current.recurrenceError).toBe("endDate");
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setDueDate("2026-09-10"));
    expect(result.current.recurrenceError).toBeNull();
    expect(result.current.canSubmit).toBe(true);
  });

  it("繰り返しなしに戻すと期限が開始日より前でもバリデーションは掛からない", () => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("買い物");
      result.current.setRecurrenceType("interval");
      result.current.setDueDate("2026-09-01");
    });
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setRecurrenceType("none"));
    expect(result.current.canSubmit).toBe(true);
  });

  it("保存に失敗しても isSubmitting が戻り onSuccess は呼ばれない", async () => {
    createTaskSchedule.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setRecurrenceType("interval");
    });

    await act(async () => {
      await expect(result.current.handleSubmit()).rejects.toThrow("boom");
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(syncTaskSchedules).not.toHaveBeenCalled();
  });

  it.each([
    ["-1", -1, false],
    ["999999", 999999, true],
    ["1000000", 1000000, false],
  ])("繰り返しありで数量が %s なら canSubmit=%s", async (_, quantity, expected) => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setRecurrenceType("interval");
      result.current.setQuantity(quantity);
    });
    expect(result.current.canSubmit).toBe(expected);

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createTaskSchedule).toHaveBeenCalledTimes(expected ? 1 : 0);
  });

  it.each([
    ["1000 文字", 1000, true],
    ["1001 文字", 1001, false],
  ])("繰り返しありでメモが %s なら canSubmit=%s", (_, length, expected) => {
    const { result } = setup();
    act(() => {
      result.current.setTitle("筋トレ");
      result.current.setRecurrenceType("interval");
      result.current.setMemo("あ".repeat(length));
    });
    expect(result.current.canSubmit).toBe(expected);
  });
});
