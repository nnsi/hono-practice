import { useMemo, useState } from "react";

import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatRecurrenceSummary,
  formatScheduleDateRange,
  sortTaskSchedules,
} from "./taskScheduleSummary";
import { createUseTaskSchedulesTab } from "./useTaskSchedulesTab";

const makeSchedule = (
  overrides: Partial<TaskScheduleRecord> = {},
): TaskScheduleRecord => ({
  id: "sch-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "筋トレ",
  memo: "",
  recurrenceType: "interval",
  intervalDays: 3,
  weekdays: null,
  startDate: "2026-09-10",
  endDate: null,
  isActive: true,
  createdAt: "2026-09-10T00:00:00Z",
  updatedAt: "2026-09-10T00:00:00Z",
  deletedAt: null,
  ...overrides,
});

const labels = {
  daily: "毎日",
  interval: (days: number) => `${days}日ごと`,
  weekday: (day: number) =>
    ["", "月", "火", "水", "木", "金", "土", "日"][day] ?? "",
  weekdaySeparator: "・",
};

describe("formatRecurrenceSummary", () => {
  it("interval: 1 日なら「毎日」、それ以外は日数付き", () => {
    expect(
      formatRecurrenceSummary(makeSchedule({ intervalDays: 1 }), labels),
    ).toBe("毎日");
    expect(formatRecurrenceSummary(makeSchedule(), labels)).toBe("3日ごと");
  });

  it("weekdays: ISO weekday 順に並べて区切りで結合する", () => {
    expect(
      formatRecurrenceSummary(
        makeSchedule({
          recurrenceType: "weekdays",
          intervalDays: null,
          weekdays: [5, 1, 3],
        }),
        labels,
      ),
    ).toBe("月・水・金");
  });

  it("date range: 終了日なしは end=null", () => {
    expect(formatScheduleDateRange(makeSchedule())).toEqual({
      start: "2026/09/10",
      end: null,
    });
    expect(
      formatScheduleDateRange(makeSchedule({ endDate: "2026-12-31" })),
    ).toEqual({ start: "2026/09/10", end: "2026/12/31" });
  });

  it("sort: 稼働中が先、同区分は開始日の新しい順", () => {
    const sorted = sortTaskSchedules([
      makeSchedule({ id: "paused", isActive: false, startDate: "2026-09-30" }),
      makeSchedule({ id: "old", startDate: "2026-09-01" }),
      makeSchedule({ id: "new", startDate: "2026-09-20" }),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["new", "old", "paused"]);
  });
});

describe("useTaskSchedulesTab", () => {
  const updateTaskSchedule = vi.fn().mockResolvedValue(undefined);
  const softDeleteTaskSchedule = vi.fn().mockResolvedValue(undefined);
  const syncTaskSchedules = vi.fn().mockResolvedValue(undefined);
  let schedules: TaskScheduleRecord[] = [];

  const useTaskSchedulesTab = createUseTaskSchedulesTab({
    react: { useState, useMemo },
    useAllTaskSchedules: () => ({ schedules }),
    taskScheduleRepository: { updateTaskSchedule, softDeleteTaskSchedule },
    syncEngine: { syncTaskSchedules },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    schedules = [
      makeSchedule({ id: "paused", isActive: false }),
      makeSchedule({ id: "active" }),
    ];
  });

  it("一覧は停止中を含み、稼働中を先頭に並べる", () => {
    const { result } = renderHook(() => useTaskSchedulesTab());
    expect(result.current.schedules.map((s) => s.id)).toEqual([
      "active",
      "paused",
    ]);
  });

  it("一時停止トグルは isActive を反転して保存し、sync を投げる", async () => {
    const { result } = renderHook(() => useTaskSchedulesTab());
    await act(async () => {
      await result.current.handleToggleActive(result.current.schedules[0]);
    });
    expect(updateTaskSchedule).toHaveBeenCalledWith("active", {
      isActive: false,
    });
    await act(async () => {
      await result.current.handleToggleActive(result.current.schedules[1]);
    });
    expect(updateTaskSchedule).toHaveBeenCalledWith("paused", {
      isActive: true,
    });
    expect(syncTaskSchedules).toHaveBeenCalledTimes(2);
  });

  it("削除は 2 段階: 確認 id を立ててから softDelete し、確認を閉じる", async () => {
    const { result } = renderHook(() => useTaskSchedulesTab());
    act(() => result.current.setDeleteConfirmId("active"));
    expect(result.current.deleteTarget?.id).toBe("active");
    expect(softDeleteTaskSchedule).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleDelete("active");
    });
    expect(softDeleteTaskSchedule).toHaveBeenCalledWith("active");
    expect(result.current.deleteConfirmId).toBeNull();
    expect(result.current.deleteTarget).toBeNull();
    expect(syncTaskSchedules).toHaveBeenCalledTimes(1);
  });

  it("sync 失敗は操作の成功を妨げない", async () => {
    syncTaskSchedules.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useTaskSchedulesTab());
    await act(async () => {
      await result.current.handleDelete("paused");
    });
    expect(softDeleteTaskSchedule).toHaveBeenCalledWith("paused");
  });

  it("編集対象の選択と成功時のクローズ", () => {
    const { result } = renderHook(() => useTaskSchedulesTab());
    act(() => result.current.setEditingSchedule(schedules[1]));
    expect(result.current.editingSchedule?.id).toBe("active");
    act(() => result.current.handleEditSuccess());
    expect(result.current.editingSchedule).toBeNull();
  });
});
