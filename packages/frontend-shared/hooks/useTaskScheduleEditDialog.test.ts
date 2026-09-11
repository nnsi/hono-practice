import { useState } from "react";

import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseTaskScheduleEditDialog } from "./useTaskScheduleEditDialog";

const schedule: TaskScheduleRecord = {
  id: "sch-1",
  userId: "user-1",
  activityId: "act-1",
  activityKindId: "kind-1",
  quantity: 10,
  title: "筋トレ",
  memo: "ベンチ",
  recurrenceType: "weekdays",
  intervalDays: null,
  weekdays: [1, 3, 5],
  startDate: "2026-09-10",
  endDate: null,
  isActive: true,
  createdAt: "2026-09-10T00:00:00Z",
  updatedAt: "2026-09-10T00:00:00Z",
  deletedAt: null,
};

describe("useTaskScheduleEditDialog", () => {
  const updateTaskSchedule = vi.fn().mockResolvedValue(undefined);
  const syncTaskSchedules = vi.fn().mockResolvedValue(undefined);
  const onSuccess = vi.fn();

  const useTaskScheduleEditDialog = createUseTaskScheduleEditDialog({
    react: { useState },
    taskScheduleRepository: { updateTaskSchedule },
    syncEngine: { syncTaskSchedules },
  });

  beforeEach(() => vi.clearAllMocks());

  const setup = () =>
    renderHook(() => useTaskScheduleEditDialog(schedule, onSuccess));

  it("既存値で初期化され、そのまま保存すると同じ内容で updateTaskSchedule を呼ぶ", async () => {
    const { result } = setup();
    expect(result.current.weekdays).toEqual([1, 3, 5]);
    expect(result.current.endDate).toBe("");
    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(updateTaskSchedule).toHaveBeenCalledWith("sch-1", {
      title: "筋トレ",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 10,
      memo: "ベンチ",
      startDate: "2026-09-10",
      endDate: null,
      recurrenceType: "weekdays",
      weekdays: [1, 3, 5],
      intervalDays: null,
    });
    expect(syncTaskSchedules).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("x日ごとに切り替えると weekdays を null にして intervalDays を送る", async () => {
    const { result } = setup();
    act(() => {
      result.current.setRecurrenceType("interval");
      result.current.setIntervalDays(3);
      result.current.setEndDate("2026-12-31");
      result.current.setTitle("  スクワット ");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(updateTaskSchedule).toHaveBeenCalledWith(
      "sch-1",
      expect.objectContaining({
        title: "スクワット",
        recurrenceType: "interval",
        intervalDays: 3,
        weekdays: null,
        endDate: "2026-12-31",
      }),
    );
  });

  it("「なし」は編集では受け付けない", () => {
    const { result } = setup();
    act(() => result.current.setRecurrenceType("none"));
    expect(result.current.recurrenceType).toBe("weekdays");
  });

  it("バリデーション: 曜日 0 個 / 終了日 < 開始日 / 空タイトル は submit 不可", async () => {
    const { result } = setup();
    act(() => {
      for (const day of [1, 3, 5]) result.current.toggleWeekday(day);
    });
    expect(result.current.recurrenceError).toBe("weekdays");
    expect(result.current.canSubmit).toBe(false);

    act(() => {
      result.current.toggleWeekday(2);
      result.current.setEndDate("2026-09-01");
    });
    expect(result.current.recurrenceError).toBe("endDate");

    act(() => {
      result.current.setEndDate("");
      result.current.setTitle("   ");
    });
    expect(result.current.recurrenceError).toBeNull();
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(updateTaskSchedule).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("タイトルが 21 文字なら submit 不可（20 文字なら可）", async () => {
    const { result } = setup();
    act(() => result.current.setTitle("あ".repeat(21)));
    expect(result.current.canSubmit).toBe(false);
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(updateTaskSchedule).not.toHaveBeenCalled();

    act(() => result.current.setTitle("あ".repeat(20)));
    expect(result.current.canSubmit).toBe(true);
  });

  it.each([
    ["-1", -1, false],
    ["999999", 999999, true],
    ["1000000", 1000000, false],
    ["未入力", null, true],
  ])("数量が %s なら canSubmit=%s", (_, quantity, expected) => {
    const { result } = setup();
    act(() => result.current.setQuantity(quantity));
    expect(result.current.canSubmit).toBe(expected);
  });

  it.each([
    ["1000 文字", 1000, true],
    ["1001 文字", 1001, false],
  ])("メモが %s なら canSubmit=%s", async (_, length, expected) => {
    const { result } = setup();
    act(() => result.current.setMemo("あ".repeat(length)));
    expect(result.current.canSubmit).toBe(expected);

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(updateTaskSchedule).toHaveBeenCalledTimes(expected ? 1 : 0);
  });
});
