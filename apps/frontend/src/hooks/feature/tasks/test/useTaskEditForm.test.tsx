import { toast } from "@frontend/components/ui/use-toast";
import { useDeleteTask, useUpdateTask } from "@frontend/hooks/api/useTasks";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskEditForm } from "../useTaskEditForm";

// モックの設定
vi.mock("@frontend/hooks/api/useTasks", () => ({
  useUpdateTask: vi.fn(),
  useDeleteTask: vi.fn(),
}));

vi.mock("@frontend/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

describe("useTaskEditForm", () => {
  const mockUpdateMutateAsync = vi.fn();
  const mockDeleteMutateAsync = vi.fn();
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

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
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as any);
    vi.mocked(useDeleteTask).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as any);
  });

  describe("フォームの初期化", () => {
    it("タスクがnullの場合、空のフォームで初期化される", () => {
      const { result } = renderHook(() =>
        useTaskEditForm(null, mockOnOpenChange),
      );

      expect(result.current.form.getValues()).toEqual({
        title: "",
        startDate: "",
        dueDate: "",
        memo: "",
      });
    });

    it("タスクが提供された場合、タスクのデータでフォームが初期化される", () => {
      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      expect(result.current.form.getValues()).toEqual({
        title: "テストタスク",
        startDate: "2024-01-15",
        dueDate: "2024-01-20",
        memo: "テストメモ",
      });
    });

    it("タスクのnull値は空文字列として扱われる", () => {
      const taskWithNulls = {
        ...mockTask,
        dueDate: null,
        memo: null,
      };

      const { result } = renderHook(() =>
        useTaskEditForm(taskWithNulls, mockOnOpenChange),
      );

      expect(result.current.form.getValues()).toEqual({
        title: "テストタスク",
        startDate: "2024-01-15",
        dueDate: "",
        memo: "",
      });
    });
  });

  describe("onSubmit", () => {
    it("タスクが更新される", async () => {
      mockUpdateMutateAsync.mockResolvedValue({});

      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange, mockOnSuccess),
      );

      const updateData = {
        title: "更新されたタスク",
        startDate: "2024-01-16",
        dueDate: "2024-01-21",
        memo: "更新されたメモ",
      };

      await act(async () => {
        await result.current.onSubmit(updateData);
      });

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: mockTask.id,
        data: {
          title: "更新されたタスク",
          startDate: "2024-01-16",
          dueDate: "2024-01-21",
          memo: "更新されたメモ",
        },
      });

      expect(toast).toHaveBeenCalledWith({
        title: "タスクを更新しました",
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("空のdueDateとmemoは適切に処理される", async () => {
      mockUpdateMutateAsync.mockResolvedValue({});

      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      const updateData = {
        title: "更新されたタスク",
        startDate: "2024-01-16",
        dueDate: "",
        memo: "",
      };

      await act(async () => {
        await result.current.onSubmit(updateData);
      });

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: mockTask.id,
        data: {
          title: "更新されたタスク",
          startDate: "2024-01-16",
          dueDate: null,
          memo: undefined,
        },
      });
    });

    it("タスクがnullの場合は何もしない", async () => {
      const { result } = renderHook(() =>
        useTaskEditForm(null, mockOnOpenChange),
      );

      const updateData = {
        title: "新しいタスク",
        startDate: "2024-01-16",
        dueDate: "",
        memo: "",
      };

      await act(async () => {
        await result.current.onSubmit(updateData);
      });

      expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });

    it("更新が失敗した場合、エラートーストが表示される", async () => {
      const error = new Error("更新エラー");
      mockUpdateMutateAsync.mockRejectedValue(error);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      const updateData = {
        title: "更新されたタスク",
        startDate: "2024-01-16",
        dueDate: "",
        memo: "",
      };

      await act(async () => {
        await result.current.onSubmit(updateData);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to update task:",
        error,
      );
      expect(toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "タスクの更新に失敗しました",
      });

      expect(mockOnOpenChange).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleDelete", () => {
    it("タスクが削除される", async () => {
      mockDeleteMutateAsync.mockResolvedValue({});

      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange, mockOnSuccess),
      );

      act(() => {
        result.current.setShowDeleteDialog(true);
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteMutateAsync).toHaveBeenCalledWith(mockTask.id);

      expect(toast).toHaveBeenCalledWith({
        title: "タスクを削除しました",
      });

      expect(result.current.showDeleteDialog).toBe(false);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("タスクがnullの場合は何もしない", async () => {
      const { result } = renderHook(() =>
        useTaskEditForm(null, mockOnOpenChange),
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });

    it("削除が失敗した場合、エラートーストが表示される", async () => {
      const error = new Error("削除エラー");
      mockDeleteMutateAsync.mockRejectedValue(error);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to delete task:",
        error,
      );
      expect(toast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "タスクの削除に失敗しました",
      });

      expect(mockOnOpenChange).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("showDeleteDialog", () => {
    it("削除ダイアログの表示状態を管理できる", () => {
      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      expect(result.current.showDeleteDialog).toBe(false);

      act(() => {
        result.current.setShowDeleteDialog(true);
      });

      expect(result.current.showDeleteDialog).toBe(true);

      act(() => {
        result.current.setShowDeleteDialog(false);
      });

      expect(result.current.showDeleteDialog).toBe(false);
    });
  });

  describe("フォームのバリデーション", () => {
    it("タイトルが必須であることを検証する", async () => {
      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      act(() => {
        result.current.form.setValue("title", "");
      });

      await act(async () => {
        await result.current.form.trigger("title");
      });

      const errors = result.current.form.formState.errors;
      expect(errors.title?.message).toBe("タイトルは必須です");
    });

    it("開始日が必須であることを検証する", async () => {
      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      act(() => {
        result.current.form.setValue("startDate", "");
      });

      await act(async () => {
        await result.current.form.trigger("startDate");
      });

      const errors = result.current.form.formState.errors;
      expect(errors.startDate?.message).toBe("開始日は必須です");
    });
  });

  describe("返り値の確認", () => {
    it("必要なプロパティとメソッドが返される", () => {
      const { result } = renderHook(() =>
        useTaskEditForm(mockTask, mockOnOpenChange),
      );

      expect(result.current.form).toBeDefined();
      expect(result.current.showDeleteDialog).toBeDefined();
      expect(result.current.setShowDeleteDialog).toBeDefined();
      expect(result.current.onSubmit).toBeDefined();
      expect(result.current.handleDelete).toBeDefined();
      expect(result.current.updateTask).toBeDefined();
      expect(result.current.deleteTask).toBeDefined();
    });
  });
});
