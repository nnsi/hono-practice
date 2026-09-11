import { useState } from "react";

import type { TaskItem } from "@packages/domain/task/types";
import type { VirtualScheduledTask } from "@packages/domain/taskSchedule";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseTaskEditDialog } from "./useTaskEditDialog";

const realTask: TaskItem = {
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "Real task",
  startDate: "2026-09-10",
  dueDate: null,
  doneDate: null,
  memo: "",
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const virtualTask: VirtualScheduledTask = {
  ...realTask,
  id: "virtual-1",
  activityId: "act-1",
  activityKindId: "kind-1",
  quantity: 5,
  scheduleId: "schedule-1",
  scheduledDate: "2026-09-10",
  title: "Bench press",
  startDate: "2026-09-10",
  dueDate: "2026-09-10",
  doneDate: null,
  archivedAt: null,
  memo: "memo",
  isVirtual: true,
};

describe("useTaskEditDialog", () => {
  const updateTask = vi.fn().mockResolvedValue(undefined);
  const createTask = vi.fn().mockResolvedValue(undefined);
  const getTasksByScheduledDate = vi.fn<() => Promise<TaskItem[]>>();
  const syncTasks = vi.fn();
  const onSuccess = vi.fn();

  const useTaskEditDialog = createUseTaskEditDialog({
    react: { useState },
    taskRepository: { updateTask, createTask, getTasksByScheduledDate },
    syncEngine: { syncTasks },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getTasksByScheduledDate.mockResolvedValue([]);
  });

  it("実 Task は updateTask で保存し、createTask は呼ばない", async () => {
    const { result } = renderHook(() => useTaskEditDialog(realTask, onSuccess));
    act(() => {
      result.current.setTitle("  Edited  ");
      result.current.setMemo(" note ");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(updateTask).toHaveBeenCalledWith("task-1", {
      title: "Edited",
      activityId: null,
      activityKindId: null,
      quantity: null,
      startDate: "2026-09-10",
      dueDate: null,
      memo: "note",
    });
    expect(createTask).not.toHaveBeenCalled();
  });

  it("仮想タスクは決定的 id で実体化（createTask）してから updateTask で編集内容を保存する", async () => {
    const { result } = renderHook(() =>
      useTaskEditDialog(virtualTask, onSuccess),
    );
    expect(result.current.title).toBe("Bench press");
    act(() => {
      result.current.setTitle("Bench press (heavy)");
      result.current.setQuantity(8);
      result.current.setDueDate("");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(getTasksByScheduledDate).toHaveBeenCalledWith("2026-09-10", [
      "schedule-1",
    ]);
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "virtual-1",
        scheduleId: "schedule-1",
        scheduledDate: "2026-09-10",
      }),
    );
    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith("virtual-1", {
      title: "Bench press (heavy)",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 8,
      startDate: "2026-09-10",
      dueDate: null,
      memo: "memo",
    });
    // createTask → updateTask の順（行が無い状態で update しない）
    const createOrder = createTask.mock.invocationCallOrder[0] ?? 0;
    const updateOrder = updateTask.mock.invocationCallOrder[0] ?? 0;
    expect(createOrder).toBeLessThan(updateOrder);
  });

  it("同 id の実 Task 行が既にあれば createTask を呼ばず updateTask だけ行う（冪等）", async () => {
    getTasksByScheduledDate.mockResolvedValue([
      {
        ...realTask,
        id: "virtual-1",
        scheduleId: "schedule-1",
        scheduledDate: "2026-09-10",
      },
    ]);
    const { result } = renderHook(() =>
      useTaskEditDialog(virtualTask, onSuccess),
    );
    act(() => result.current.setTitle("Bench press (light)"));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(updateTask).toHaveBeenCalledWith(
      "virtual-1",
      expect.objectContaining({ title: "Bench press (light)" }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("保存後に syncTasks と onSuccess を呼び、isSubmitting が戻る", async () => {
    const { result } = renderHook(() =>
      useTaskEditDialog(virtualTask, onSuccess),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(syncTasks).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it.each([
    ["空", "   "],
    ["21 文字", "あ".repeat(21)],
  ])("タイトルが%sなら何も保存しない", async (_, value) => {
    const { result } = renderHook(() => useTaskEditDialog(realTask, onSuccess));
    act(() => result.current.setTitle(value));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(updateTask).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("保存が失敗しても isSubmitting が戻り onSuccess は呼ばない", async () => {
    createTask.mockRejectedValueOnce(new Error("insert failed"));
    const { result } = renderHook(() =>
      useTaskEditDialog(virtualTask, onSuccess),
    );

    await act(async () => {
      await expect(result.current.handleSubmit()).rejects.toThrow(
        "insert failed",
      );
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
