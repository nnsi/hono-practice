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
  const mockSyncTasks = vi.fn().mockResolvedValue(undefined);
  const mockSyncActivityLogs = vi.fn().mockResolvedValue(undefined);

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

  it("task更新後にlog作成が失敗したらdoneDateを元に戻す", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 3,
    });
    mockCreateActivityLog.mockRejectedValueOnce(new Error("log failed"));

    const { result } = renderHook(() => useDailyPage());
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.handleToggleTask(task);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(
      expect.objectContaining({ message: "log failed" }),
    );
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, "task-1", {
      doneDate: expect.any(String),
    });
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, "task-1", {
      doneDate: null,
    });
  });

  it("log削除が失敗したらdoneDateを元に戻す", async () => {
    const task = makeTask({
      activityId: "act-1",
      doneDate: "2026-03-14",
    });
    mockSoftDeleteByTaskId.mockRejectedValueOnce(new Error("delete failed"));

    const { result } = renderHook(() => useDailyPage());
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.handleToggleTask(task);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(
      expect.objectContaining({ message: "delete failed" }),
    );
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, "task-1", {
      doneDate: null,
    });
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, "task-1", {
      doneDate: "2026-03-14",
    });
  });

  it("syncが失敗してもtask/logのローカル更新は成功扱いにする", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 3,
    });
    mockSyncTasks.mockRejectedValueOnce(new Error("sync failed"));
    mockSyncActivityLogs.mockRejectedValueOnce(new Error("sync failed"));

    const { result } = renderHook(() => useDailyPage());

    await act(async () => {
      await result.current.handleToggleTask(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateActivityLog).toHaveBeenCalledTimes(1);
  });

  it("同一taskの重複実行を抑止する", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 3,
    });
    let resolveUpdate!: () => void;
    mockUpdateTask.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const { result } = renderHook(() => useDailyPage());

    const firstCall = act(async () => {
      await result.current.handleToggleTask(task);
    });
    const secondCall = act(async () => {
      await result.current.handleToggleTask(task);
    });

    resolveUpdate();
    await firstCall;
    await secondCall;

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateActivityLog).toHaveBeenCalledTimes(1);
  });
});
