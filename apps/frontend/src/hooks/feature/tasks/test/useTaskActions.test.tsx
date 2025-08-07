import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskActions } from "../useTaskActions";

// モックの設定
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockArchiveMutate = vi.fn();

vi.mock("@packages/frontend-shared/hooks", () => ({
  createUseUpdateTask: vi.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
  })),
  createUseDeleteTask: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
  createUseArchiveTask: vi.fn(() => ({
    mutate: mockArchiveMutate,
    isPending: false,
  })),
}));

describe("useTaskActions", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe("初期状態", () => {
    it("ダイアログが閉じている状態で初期化される", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });

      expect(result.current.createDialogOpen).toBe(false);
      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe("handleToggleTaskDone", () => {
    it("未完了のタスクを完了にする", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });
      const today = dayjs().format("YYYY-MM-DD");

      result.current.handleToggleTaskDone(mockTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: mockTask.id,
        data: {
          doneDate: today,
        },
      });
    });

    it("完了済みのタスクを未完了にする", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });
      const completedTask = {
        ...mockTask,
        doneDate: "2024-01-16",
      };

      result.current.handleToggleTaskDone(completedTask);

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: completedTask.id,
        data: {
          doneDate: null,
        },
      });
    });
  });

  describe("handleDeleteTask", () => {
    it("タスクを削除する", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      result.current.handleDeleteTask(mockEvent, mockTask);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockDeleteMutate).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe("handleArchiveTask", () => {
    it("開始日があるタスクをアーカイブする", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });
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
      const { result } = renderHook(() => useTaskActions(), { wrapper });
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
      const { result } = renderHook(() => useTaskActions(), { wrapper });

      act(() => {
        result.current.handleStartEdit(mockTask);
      });

      expect(result.current.selectedTask).toEqual(mockTask);
      expect(result.current.editDialogOpen).toBe(true);
    });
  });

  describe("handleEditDialogClose", () => {
    it("編集ダイアログを閉じて選択を解除する", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });

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
      const { result } = renderHook(() => useTaskActions(), { wrapper });

      expect(result.current.formatDate("2024-01-15")).toBe("01/15");
      expect(result.current.formatDate("2024-12-31")).toBe("12/31");
    });

    it("nullの場合はnullを返す", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });

      expect(result.current.formatDate(null)).toBeNull();
    });
  });

  describe("createDialogOpen", () => {
    it("作成ダイアログの開閉を制御できる", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });

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

  describe("複数のアクションの組み合わせ", () => {
    it("タスクの編集開始後に別のタスクを編集できる", () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });
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
