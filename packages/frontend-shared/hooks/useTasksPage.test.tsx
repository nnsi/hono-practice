import { useMemo, useState } from "react";

import type { TaskItem } from "@packages/domain/task/types";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseTasksPage } from "./useTasksPage";

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "Test task",
  startDate: "2026-03-14",
  dueDate: null,
  doneDate: null,
  memo: "",
  archivedAt: null,
  createdAt: "2026-03-14T00:00:00Z",
  updatedAt: "2026-03-14T00:00:00Z",
  ...overrides,
});

describe("useTasksPage handleToggleDone", () => {
  const mockUpdateTask = vi.fn().mockResolvedValue(undefined);
  const mockSoftDeleteTask = vi.fn().mockResolvedValue(undefined);
  const mockArchiveTask = vi.fn().mockResolvedValue(undefined);
  const mockCreateActivityLog = vi.fn().mockResolvedValue(undefined);
  const mockSoftDeleteByTaskId = vi.fn().mockResolvedValue(undefined);
  const mockSyncTasks = vi.fn().mockResolvedValue(undefined);
  const mockSyncActivityLogs = vi.fn().mockResolvedValue(undefined);

  let activeTasks: TaskItem[] = [];

  const useTasksPage = createUseTasksPage({
    react: { useState, useMemo },
    useActiveTasks: () => ({ tasks: activeTasks }),
    useArchivedTasks: () => ({ tasks: [] }),
    taskRepository: {
      updateTask: mockUpdateTask,
      softDeleteTask: mockSoftDeleteTask,
      archiveTask: mockArchiveTask,
    },
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
    activeTasks = [makeTask()];
  });

  it("タスク完了時にactivityIdがあればActivityLogを自動作成する", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
    });

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleToggleDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      doneDate: expect.any(String),
    });
    expect(mockCreateActivityLog).toHaveBeenCalledWith({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
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

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleToggleDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalled();
    expect(mockCreateActivityLog).not.toHaveBeenCalled();
    expect(mockSyncActivityLogs).not.toHaveBeenCalled();
    expect(mockSyncTasks).toHaveBeenCalled();
  });

  it("タスクを未完了に戻す時はsoftDeleteActivityLogByTaskIdが呼ばれる", async () => {
    const task = makeTask({
      activityId: "act-1",
      doneDate: "2026-03-14",
    });

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleToggleDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
      doneDate: null,
    });
    expect(mockCreateActivityLog).not.toHaveBeenCalled();
    expect(mockSoftDeleteByTaskId).toHaveBeenCalledWith("task-1");
    expect(mockSyncActivityLogs).toHaveBeenCalled();
  });

  it("quantityがnullの場合はActivityLogを作成しない", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: null,
      quantity: null,
    });

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleToggleDone(task);
    });

    expect(mockCreateActivityLog).not.toHaveBeenCalled();
    expect(mockSyncActivityLogs).not.toHaveBeenCalled();
  });

  it("task更新後にlog作成が失敗したらdoneDateを元に戻す", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
    });
    mockCreateActivityLog.mockRejectedValueOnce(new Error("log failed"));

    const { result } = renderHook(() => useTasksPage());
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.handleToggleDone(task);
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
    expect(mockSyncTasks).not.toHaveBeenCalled();
  });

  it("log削除が失敗したらdoneDateを元に戻す", async () => {
    const task = makeTask({
      activityId: "act-1",
      doneDate: "2026-03-14",
    });
    mockSoftDeleteByTaskId.mockRejectedValueOnce(new Error("delete failed"));

    const { result } = renderHook(() => useTasksPage());
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.handleToggleDone(task);
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
    expect(mockSyncActivityLogs).not.toHaveBeenCalled();
  });

  it("rollback自体が失敗したら元エラーとrollbackエラーを保持して投げる", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
    });
    const rollbackError = new Error("rollback failed");
    mockCreateActivityLog.mockRejectedValueOnce(new Error("log failed"));
    mockUpdateTask
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(rollbackError);

    const { result } = renderHook(() => useTasksPage());
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.handleToggleDone(task);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(
      expect.objectContaining({
        message: "Failed to rollback task toggle",
        cause: expect.objectContaining({
          originalError: expect.objectContaining({ message: "log failed" }),
          rollbackError,
        }),
      }),
    );
    expect(mockUpdateTask).toHaveBeenNthCalledWith(1, "task-1", {
      doneDate: expect.any(String),
    });
    expect(mockUpdateTask).toHaveBeenNthCalledWith(2, "task-1", {
      doneDate: null,
    });
    expect(mockSyncTasks).not.toHaveBeenCalled();
    expect(mockSyncActivityLogs).not.toHaveBeenCalled();
  });

  it("syncが失敗してもtask/logのローカル更新は成功扱いにする", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
    });
    mockSyncTasks.mockRejectedValueOnce(new Error("sync failed"));
    mockSyncActivityLogs.mockRejectedValueOnce(new Error("sync failed"));

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleToggleDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateActivityLog).toHaveBeenCalledTimes(1);
  });

  it("同一taskの重複実行を抑止する", async () => {
    const task = makeTask({
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
    });
    let resolveUpdate!: () => void;
    mockUpdateTask.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      const firstCall = result.current.handleToggleDone(task);
      const secondCall = result.current.handleToggleDone(task);

      resolveUpdate();
      await Promise.all([firstCall, secondCall]);
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateActivityLog).toHaveBeenCalledTimes(1);
  });
});
