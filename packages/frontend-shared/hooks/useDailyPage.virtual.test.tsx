import { useCallback, useMemo, useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityBase, DailyTask } from "./types";
import { createUseDailyPage } from "./useDailyPage";
import { schedule, today, virtualId } from "./useTasksPage.virtual.harness";

type TestActivity = ActivityBase;
type TestKind = { id: string };

describe("useDailyPage 仮想タスク（scheduleId の伝搬と実体化）", () => {
  const createTask = vi.fn().mockResolvedValue(undefined);
  const updateTask = vi.fn().mockResolvedValue(undefined);
  const rawTask: DailyTask = {
    id: "task-1",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "Real task",
    doneDate: null,
    memo: "",
    startDate: today,
    dueDate: null,
    scheduleId: "schedule-old",
  };

  const useDailyPage = createUseDailyPage<TestActivity, TestKind>({
    react: { useState, useMemo, useCallback },
    useActivities: () => ({ activities: [] }),
    useActivityLogsByDate: () => ({ logs: [] }),
    useTasksByDate: () => [rawTask],
    useAllKinds: () => [],
    useActiveTaskSchedules: () => ({ schedules: [schedule] }),
    useTasksOnScheduledDate: () => ({ tasks: [] }),
    taskRepository: {
      createTask,
      updateTask,
      getTasksByScheduledDate: vi.fn().mockResolvedValue([]),
    },
    activityLogRepository: {
      createActivityLog: vi.fn().mockResolvedValue(undefined),
      softDeleteActivityLogByTaskId: vi.fn().mockResolvedValue(undefined),
    },
    syncEngine: {
      syncTasks: vi.fn().mockResolvedValue(undefined),
      syncActivityLogs: vi.fn().mockResolvedValue(undefined),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("実 Task の scheduleId と仮想タスクの scheduleId の両方が DailyTask に載る", () => {
    const { result } = renderHook(() => useDailyPage());

    expect(result.current.tasks).toEqual([
      expect.objectContaining({
        id: "task-1",
        scheduleId: "schedule-old",
      }),
      expect.objectContaining({
        id: virtualId,
        scheduleId: "schedule-1",
        isVirtual: true,
      }),
    ]);
    expect(result.current.tasks[0]?.isVirtual).toBeUndefined();
  });

  it("materializeIfVirtual は仮想タスクなら決定的 id で未完了の実 Task 行を作る", async () => {
    const { result } = renderHook(() => useDailyPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      await result.current.materializeIfVirtual(virtual);
    });

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: virtualId,
        scheduleId: "schedule-1",
        scheduledDate: today,
        title: "Bench press",
      }),
    );
  });

  it("materializeIfVirtual は実 Task ならなにもしない", async () => {
    const { result } = renderHook(() => useDailyPage());

    await act(async () => {
      await result.current.materializeIfVirtual(rawTask);
    });

    expect(createTask).not.toHaveBeenCalled();
  });

  it("findEditableTask は実 Task を rawTasks から返す（仮想タスクではない）", () => {
    const { result } = renderHook(() => useDailyPage());

    const found = result.current.findEditableTask("task-1");
    expect(found).toBe(rawTask);
    expect(found && "isVirtual" in found).toBe(false);
  });

  it("findEditableTask は仮想タスクを isVirtual 付きで返し、行は作らない", () => {
    const { result } = renderHook(() => useDailyPage());

    expect(result.current.findEditableTask(virtualId)).toEqual(
      expect.objectContaining({
        id: virtualId,
        scheduleId: "schedule-1",
        scheduledDate: today,
        isVirtual: true,
      }),
    );
    expect(createTask).not.toHaveBeenCalled();
  });

  it("findEditableTask は不明な id なら undefined を返す", () => {
    const { result } = renderHook(() => useDailyPage());
    expect(result.current.findEditableTask("nope")).toBeUndefined();
  });
});
