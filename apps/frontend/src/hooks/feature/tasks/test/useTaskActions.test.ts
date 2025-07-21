import type React from "react";

import {
  useArchiveTask,
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import { act, renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskActions } from "../useTaskActions";

// モックの設定
vi.mock("@frontend/hooks/sync/useSyncedTask", () => ({
  useUpdateTask: vi.fn(),
  useDeleteTask: vi.fn(),
  useArchiveTask: vi.fn(),
}));

describe("useTaskActions", () => {
  const mockUpdateMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
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
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateTask).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);
    vi.mocked(useDeleteTask).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    } as any);
    vi.mocked(useArchiveTask).mockReturnValue({
      mutate: mockArchiveMutate,
      isPending: false,
    } as any);
  });

  describe("初期状態", () => {
    it("ダイアログが閉じている状態で初期化される", () => {
      const { result } = renderHook(() => useTaskActions());

      expect(result.current.createDialogOpen).toBe(false);
      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe("handleToggleTaskDone", () => {
    it("未完了のタスクを完了にする", () => {
      const { result } = renderHook(() => useTaskActions());
      const today = dayjs().format("YYYY-MM-DD");

      result.current.handleToggleTaskDone(mockTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        doneDate: today,
      });
    });

    it("完了済みのタスクを未完了にする", () => {
      const { result } = renderHook(() => useTaskActions());
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

  describe("handleDeleteTask", () => {
    it("タスクを削除する", () => {
      const { result } = renderHook(() => useTaskActions());
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      result.current.handleDeleteTask(mockEvent, mockTask);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockDeleteMutate).toHaveBeenCalledWith({
        id: mockTask.id,
      });
    });
  });

  describe("handleArchiveTask", () => {
    it("開始日があるタスクをアーカイブする", () => {
      const { result } = renderHook(() => useTaskActions());
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      result.current.handleArchiveTask(mockEvent, mockTask);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockArchiveMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        date: mockTask.startDate,
      });
    });

    it("開始日がないタスクをアーカイブする", () => {
      const { result } = renderHook(() => useTaskActions());
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;
      const taskWithoutStartDate = {
        ...mockTask,
        startDate: null,
      };

      result.current.handleArchiveTask(mockEvent, taskWithoutStartDate);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockArchiveMutate).toHaveBeenCalledWith({
        id: taskWithoutStartDate.id,
        date: undefined,
      });
    });
  });

  describe("handleStartEdit", () => {
    it("選択したタスクで編集ダイアログを開く", () => {
      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.handleStartEdit(mockTask);
      });

      expect(result.current.selectedTask).toEqual(mockTask);
      expect(result.current.editDialogOpen).toBe(true);
    });
  });

  describe("handleEditDialogClose", () => {
    it("編集ダイアログを閉じて選択を解除する", () => {
      const { result } = renderHook(() => useTaskActions());

      // まず編集ダイアログを開く
      act(() => {
        result.current.handleStartEdit(mockTask);
      });
      expect(result.current.editDialogOpen).toBe(true);
      expect(result.current.selectedTask).toEqual(mockTask);

      // 編集ダイアログを閉じる
      act(() => {
        result.current.handleEditDialogClose();
      });

      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe("formatDate", () => {
    it("日付文字列をMM/DD形式にフォーマットする", () => {
      const { result } = renderHook(() => useTaskActions());

      expect(result.current.formatDate("2024-01-15")).toBe("01/15");
      expect(result.current.formatDate("2024-12-31")).toBe("12/31");
    });

    it("nullの場合はnullを返す", () => {
      const { result } = renderHook(() => useTaskActions());

      expect(result.current.formatDate(null)).toBeNull();
    });
  });

  describe("createDialogOpen", () => {
    it("作成ダイアログの開閉を制御できる", () => {
      const { result } = renderHook(() => useTaskActions());

      expect(result.current.createDialogOpen).toBe(false);

      act(() => {
        result.current.setCreateDialogOpen(true);
      });
      expect(result.current.createDialogOpen).toBe(true);

      act(() => {
        result.current.setCreateDialogOpen(false);
      });
      expect(result.current.createDialogOpen).toBe(false);
    });
  });

  describe("mutation states", () => {
    it("deleteタスクのpending状態を返す", () => {
      vi.mocked(useDeleteTask).mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: true,
      } as any);

      const { result } = renderHook(() => useTaskActions());

      expect(result.current.deleteTaskPending).toBe(true);
    });

    it("archiveタスクのpending状態を返す", () => {
      vi.mocked(useArchiveTask).mockReturnValue({
        mutate: mockArchiveMutate,
        isPending: true,
      } as any);

      const { result } = renderHook(() => useTaskActions());

      expect(result.current.archiveTaskPending).toBe(true);
    });
  });

  describe("複数のアクションの組み合わせ", () => {
    it("タスクの編集開始後に別のタスクを編集できる", () => {
      const { result } = renderHook(() => useTaskActions());
      const anotherTask = {
        ...mockTask,
        id: "00000000-0000-4000-8000-000000000003",
        title: "別のタスク",
      };

      // 最初のタスクを編集
      act(() => {
        result.current.handleStartEdit(mockTask);
      });
      expect(result.current.selectedTask).toEqual(mockTask);

      // 別のタスクを編集
      act(() => {
        result.current.handleStartEdit(anotherTask);
      });
      expect(result.current.selectedTask).toEqual(anotherTask);
      expect(result.current.editDialogOpen).toBe(true);
    });
  });
});
