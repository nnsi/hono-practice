import {
  useArchiveTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import { act, renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskGroup } from "../useTaskGroup";

// モックの設定
vi.mock("@frontend/hooks/sync/useSyncedTask", () => ({
  useUpdateTask: vi.fn(),
  useArchiveTask: vi.fn(),
}));

describe("useTaskGroup", () => {
  const mockUpdateMutate = vi.fn();
  const mockArchiveMutate = vi.fn();

  const mockTask = {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "テストタスク",
    startDate: "2024-01-15",
    dueDate: "2024-01-20",
    doneDate: null,
    memo: "テストメモ",
    archivedAt: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-10T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);
    vi.mocked(useArchiveTask).mockReturnValue({
      mutate: mockArchiveMutate,
      isPending: false,
    } as any);
  });

  describe("初期状態", () => {
    it("編集ダイアログが閉じている状態で初期化される", () => {
      const { result } = renderHook(() => useTaskGroup());

      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe("handleToggleTaskDone", () => {
    it("未完了のタスクを完了にする", () => {
      const { result } = renderHook(() => useTaskGroup());
      const today = dayjs().format("YYYY-MM-DD");

      result.current.handleToggleTaskDone(mockTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        doneDate: today,
      });
    });

    it("完了済みのタスクを未完了にする", () => {
      const { result } = renderHook(() => useTaskGroup());
      const completedTask = {
        ...mockTask,
        doneDate: "2024-01-16",
      };

      result.current.handleToggleTaskDone(completedTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: completedTask.id,
        doneDate: null,
      });
    });
  });

  describe("handleMoveToToday", () => {
    it("タスクを今日に移動する", () => {
      const { result } = renderHook(() => useTaskGroup());
      const today = dayjs().format("YYYY-MM-DD");

      result.current.handleMoveToToday(mockTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        startDate: today,
        dueDate: today,
      });
    });

    it("開始日と締切日の両方が今日に設定される", () => {
      const { result } = renderHook(() => useTaskGroup());
      const today = dayjs().format("YYYY-MM-DD");
      const futureTask = {
        ...mockTask,
        startDate: "2024-02-01",
        dueDate: "2024-02-10",
      };

      result.current.handleMoveToToday(futureTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: futureTask.id,
        startDate: today,
        dueDate: today,
      });
    });
  });

  describe("handleArchiveTask", () => {
    it("開始日があるタスクをアーカイブする", () => {
      const { result } = renderHook(() => useTaskGroup());

      result.current.handleArchiveTask(mockTask);

      expect(mockArchiveMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        date: mockTask.startDate,
      });
    });

    it("開始日がないタスクをアーカイブする", () => {
      const { result } = renderHook(() => useTaskGroup());
      const taskWithoutStartDate = {
        ...mockTask,
        startDate: null,
      };

      result.current.handleArchiveTask(taskWithoutStartDate);

      expect(mockArchiveMutate).toHaveBeenCalledWith({
        id: taskWithoutStartDate.id,
        date: undefined,
      });
    });
  });

  describe("handleTaskClick", () => {
    it("タスクをクリックすると編集ダイアログが開く", () => {
      const { result } = renderHook(() => useTaskGroup());

      act(() => {
        result.current.handleTaskClick(mockTask);
      });

      expect(result.current.selectedTask).toEqual(mockTask);
      expect(result.current.editDialogOpen).toBe(true);
    });

    it("別のタスクをクリックすると選択が更新される", () => {
      const { result } = renderHook(() => useTaskGroup());
      const anotherTask = {
        ...mockTask,
        id: "00000000-0000-4000-8000-000000000003",
        title: "別のタスク",
      };

      // 最初のタスクをクリック
      act(() => {
        result.current.handleTaskClick(mockTask);
      });
      expect(result.current.selectedTask).toEqual(mockTask);

      // 別のタスクをクリック
      act(() => {
        result.current.handleTaskClick(anotherTask);
      });
      expect(result.current.selectedTask).toEqual(anotherTask);
      expect(result.current.editDialogOpen).toBe(true);
    });
  });

  describe("handleDialogSuccess", () => {
    it("ダイアログを閉じて選択を解除する", () => {
      const { result } = renderHook(() => useTaskGroup());

      // まずタスクを選択して編集ダイアログを開く
      act(() => {
        result.current.handleTaskClick(mockTask);
      });
      expect(result.current.editDialogOpen).toBe(true);
      expect(result.current.selectedTask).toEqual(mockTask);

      // ダイアログ成功時の処理
      act(() => {
        result.current.handleDialogSuccess();
      });

      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe("setEditDialogOpen", () => {
    it("編集ダイアログの開閉を直接制御できる", () => {
      const { result } = renderHook(() => useTaskGroup());

      expect(result.current.editDialogOpen).toBe(false);

      act(() => {
        result.current.setEditDialogOpen(true);
      });
      expect(result.current.editDialogOpen).toBe(true);

      act(() => {
        result.current.setEditDialogOpen(false);
      });
      expect(result.current.editDialogOpen).toBe(false);
    });
  });

  describe("複数のアクションの組み合わせ", () => {
    it("タスクを完了にしてからアーカイブできる", () => {
      const { result } = renderHook(() => useTaskGroup());

      // タスクを完了にする
      result.current.handleToggleTaskDone(mockTask);
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        doneDate: dayjs().format("YYYY-MM-DD"),
      });

      // 完了済みタスクをアーカイブする
      const completedTask = {
        ...mockTask,
        doneDate: dayjs().format("YYYY-MM-DD"),
      };
      result.current.handleArchiveTask(completedTask);
      expect(mockArchiveMutate).toHaveBeenCalledWith({
        id: completedTask.id,
        date: completedTask.startDate,
      });
    });

    it("タスクを今日に移動してから編集できる", () => {
      const { result } = renderHook(() => useTaskGroup());
      const today = dayjs().format("YYYY-MM-DD");

      // タスクを今日に移動
      result.current.handleMoveToToday(mockTask);
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        startDate: today,
        dueDate: today,
      });

      // 移動したタスクを編集
      const movedTask = {
        ...mockTask,
        startDate: today,
        dueDate: today,
      };
      act(() => {
        result.current.handleTaskClick(movedTask);
      });
      expect(result.current.selectedTask).toEqual(movedTask);
      expect(result.current.editDialogOpen).toBe(true);
    });
  });
});
