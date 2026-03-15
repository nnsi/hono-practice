import { useCallback, useMemo, useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityBase, DailyTask } from "./types";
import { createUseDailyPage } from "./useDailyPage";

type TestActivity = ActivityBase;
type TestKind = { id: string };

describe("useDailyPage handleToggleTask", () => {
  const mockUpdateTask = vi.fn().mockResolvedValue(undefined);
  const mockCreateActivityLog = vi.fn().mockResolvedValue(undefined);
  const mockSoftDeleteByTaskId = vi.fn().mockResolvedValue(undefined);
  const mockSyncTasks = vi.fn();
  const mockSyncActivityLogs = vi.fn();

  const useDailyPage = createUseDailyPage<TestActivity, TestKind>({
    react: { useState, useMemo, useCallback },
    useActivities: () => ({ activities: [] }),
    useActivityLogsByDate: () => ({ logs: [] }),
    useTasksByDate: () => [],
    useAllKinds: () => [],
    taskRepository: { updateTask: mockUpdateTask },
    activityLogRepository: {
      createActivityLog: mockCreateActivityLog,
      softDeleteActivityLogByTaskId: mockSoftDeleteByTaskId,
    },
    syncEngine: {
      syncTasks: mockSyncTasks,
      syncActivityLogs: mockSyncActivityLogs,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeTask = (overrides: Partial<DailyTask> = {}): DailyTask => ({
    id: "task-1",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "Test",
    doneDate: null,
    memo: "",
    startDate: "2026-03-14",
    dueDate: null,
    ...overrides,
  });

  it("タスク完了時にactivityIdがあればActivityLogを自動作成する", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 3,
    });

    const { result } = renderHook(() => useDailyPage());

    await act(async () => {
      await result.current.handleToggleTask(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      doneDate: expect.any(String),
    });
    expect(mockCreateActivityLog).toHaveBeenCalledWith({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 3,
      memo: "",
      date: expect.any(String),
      time: null,
      taskId: "task-1",
    });
    expect(mockSyncActivityLogs).toHaveBeenCalled();
    expect(mockSyncTasks).toHaveBeenCalled();
  });

  it("タスク完了時にactivityIdがなければActivityLogを作成しない", async () => {
    const task = makeTask({ activityId: null });

    const { result } = renderHook(() => useDailyPage());

    await act(async () => {
      await result.current.handleToggleTask(task);
    });

    expect(mockCreateActivityLog).not.toHaveBeenCalled();
    expect(mockSyncActivityLogs).not.toHaveBeenCalled();
  });

  it("タスクを未完了に戻す時はsoftDeleteActivityLogByTaskIdが呼ばれる", async () => {
    const task = makeTask({
      activityId: "act-1",
      doneDate: "2026-03-14",
    });

    const { result } = renderHook(() => useDailyPage());

    await act(async () => {
      await result.current.handleToggleTask(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      doneDate: null,
    });
    expect(mockCreateActivityLog).not.toHaveBeenCalled();
    expect(mockSoftDeleteByTaskId).toHaveBeenCalledWith("task-1");
    expect(mockSyncActivityLogs).toHaveBeenCalled();
  });
});
