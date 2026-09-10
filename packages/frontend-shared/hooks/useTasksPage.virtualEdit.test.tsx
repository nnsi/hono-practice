import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createVirtualTasksPageHarness,
  virtualId,
} from "./useTasksPage.virtual.harness";

describe("useTasksPage 仮想タスクの編集・archive・連打", () => {
  const { mocks, useTasksPage, reset } = createVirtualTasksPageHarness();

  beforeEach(reset);

  it("編集ダイアログ起動時は実体化せず editingTask に仮想タスクをそのまま入れる", async () => {
    const { result } = renderHook(() => useTasksPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      result.current.setEditingTask(virtual);
    });

    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(result.current.editingTask).toBe(virtual);
    expect(result.current.editingTask).toMatchObject({ isVirtual: true });
  });

  it("仮想タスクを編集ダイアログから削除すると実体化→softDelete され、ダイアログが閉じる", async () => {
    const { result } = renderHook(() => useTasksPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      result.current.setEditingTask(virtual);
    });
    // Web/Mobile の onDelete と同じ: ダイアログを閉じて確認 → handleDelete(id)
    await act(async () => {
      result.current.setEditingTask(null);
      result.current.setDeleteConfirmId(virtualId);
    });
    await act(async () => {
      await result.current.handleDelete(virtualId);
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.softDeleteTask).toHaveBeenCalledWith(virtualId);
    expect(result.current.editingTask).toBeNull();
    expect(result.current.deleteConfirmId).toBeNull();
  });

  it("archive は実体化してから archiveTask を呼ぶ", async () => {
    const { result } = renderHook(() => useTasksPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      await result.current.handleArchive(virtual);
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.archiveTask).toHaveBeenCalledWith(virtualId);
    expect(mocks.createTask.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.archiveTask.mock.invocationCallOrder[0],
    );
  });

  it("同じ仮想タスクへの連打で createTask が 2 回走らない", async () => {
    let resolveCreate!: () => void;
    mocks.createTask.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const { result } = renderHook(() => useTasksPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      const first = result.current.handleToggleDone(virtual);
      const second = result.current.handleDelete(virtualId);
      // 実体化は先に既存行の有無を引くので、createTask 到達を待ってから解決する
      await vi.waitFor(() => expect(mocks.createTask).toHaveBeenCalled());
      resolveCreate();
      await Promise.all([first, second]);
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.updateTask).toHaveBeenCalledTimes(1);
    expect(mocks.softDeleteTask).not.toHaveBeenCalled();
  });
});
