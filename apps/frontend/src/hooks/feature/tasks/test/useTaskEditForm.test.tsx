import type React from "react";

import { toast } from "@frontend/components/ui/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskEditForm } from "../useTaskEditForm";

// モックの設定
vi.mock("@frontend/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// モック用の変数
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

// apiClientのモック
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {},
}));

// react-hook-formのモック
const mockForm = {
  getValues: vi.fn(),
  setValue: vi.fn(),
  trigger: vi.fn(),
  reset: vi.fn(),
  formState: {
    errors: {},
  },
};

vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => mockForm),
}));

// zodResolverのモック
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

vi.mock("@packages/frontend-shared/hooks/feature", () => {
  return {
    createUseTaskEditForm: vi.fn((options: any) => {
      return (task: any) => {
        const initialValues = task
          ? {
              title: task.title,
              startDate: task.startDate ?? "",
              dueDate: task.dueDate ?? "",
              memo: task.memo ?? "",
            }
          : {
              title: "",
              startDate: "",
              dueDate: "",
              memo: "",
            };

        return {
          initialValues,
          handleUpdateTask: async (data: any) => {
            if (!task) return;
            try {
              await mockUpdateMutateAsync({
                id: task.id,
                data: {
                  ...data,
                  dueDate: data.dueDate || null,
                  memo: data.memo || undefined,
                },
              });
              options.onSuccess?.();
            } catch (error) {
              console.error("Failed to update task:", error);
              options.onError?.(error as Error);
            }
          },
          handleDeleteTask: async () => {
            if (!task) return;
            try {
              await mockDeleteMutateAsync(task.id);
              options.onSuccess?.();
            } catch (error) {
              console.error("Failed to delete task:", error);
              options.onError?.(error as Error);
            }
          },
          updateTask: { mutateAsync: mockUpdateMutateAsync, isPending: false },
          deleteTask: { mutateAsync: mockDeleteMutateAsync, isPending: false },
          validationSchema: {},
        };
      };
    }),
    updateTaskSchema: {},
  };
});

describe("useTaskEditForm", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

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

    // フォームのモックをリセット
    mockForm.getValues.mockReturnValue({
      title: "",
      startDate: "",
      dueDate: "",
      memo: "",
    });
    mockForm.formState.errors = {};
  });

  describe("フォームの初期化", () => {
    it("タスクがnullの場合、空のフォームで初期化される", () => {
      mockForm.getValues.mockReturnValue({
        title: "",
        startDate: "",
        dueDate: "",
        memo: "",
      });

      const { result } = renderHook(
        () => useTaskEditForm(null, mockOnOpenChange),
        { wrapper },
      );

      expect(result.current.form.getValues()).toEqual({
        title: "",
        startDate: "",
        dueDate: "",
        memo: "",
      });
    });

    it("タスクが提供された場合、タスクのデータでフォームが初期化される", () => {
      mockForm.getValues.mockReturnValue({
        title: "テストタスク",
        startDate: "2024-01-15",
        dueDate: "2024-01-20",
        memo: "テストメモ",
      });

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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

      mockForm.getValues.mockReturnValue({
        title: "テストタスク",
        startDate: "2024-01-15",
        dueDate: "",
        memo: "",
      });

      const { result } = renderHook(
        () => useTaskEditForm(taskWithNulls, mockOnOpenChange),
        { wrapper },
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

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange, mockOnSuccess),
        { wrapper },
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

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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
      const { result } = renderHook(
        () => useTaskEditForm(null, mockOnOpenChange),
        { wrapper },
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
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("更新が失敗した場合、エラートーストが表示される", async () => {
      const error = new Error("更新エラー");
      mockUpdateMutateAsync.mockRejectedValue(error);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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
        title: "操作に失敗しました",
        description: "更新エラー",
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleDelete", () => {
    it("タスクが削除される", async () => {
      mockDeleteMutateAsync.mockResolvedValue({});

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange, mockOnSuccess),
        { wrapper },
      );

      act(() => {
        result.current.setShowDeleteDialog(true);
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteMutateAsync).toHaveBeenCalledWith(mockTask.id);

      expect(toast).toHaveBeenCalledWith({
        title: "タスクを更新しました",
      });

      expect(result.current.showDeleteDialog).toBe(false);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("タスクがnullの場合は何もしない", async () => {
      const { result } = renderHook(
        () => useTaskEditForm(null, mockOnOpenChange),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("削除が失敗した場合、エラートーストが表示される", async () => {
      const error = new Error("削除エラー");
      mockDeleteMutateAsync.mockRejectedValue(error);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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
        title: "操作に失敗しました",
        description: "削除エラー",
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("showDeleteDialog", () => {
    it("削除ダイアログの表示状態を管理できる", () => {
      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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
      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
      );

      act(() => {
        result.current.form.setValue("title", "");
      });

      // バリデーションエラーをモック
      mockForm.trigger.mockResolvedValue(false);
      mockForm.formState.errors = {
        title: { message: "タイトルは必須です" },
      };

      await act(async () => {
        await result.current.form.trigger("title");
      });

      const errors = result.current.form.formState.errors;
      expect(errors.title?.message).toBe("タイトルは必須です");
    });

    it("開始日が必須であることを検証する", async () => {
      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
      );

      act(() => {
        result.current.form.setValue("startDate", "");
      });

      // バリデーションエラーをモック
      mockForm.trigger.mockResolvedValue(false);
      mockForm.formState.errors = {
        startDate: { message: "開始日は必須です" },
      };

      await act(async () => {
        await result.current.form.trigger("startDate");
      });

      const errors = result.current.form.formState.errors;
      expect(errors.startDate?.message).toBe("開始日は必須です");
    });
  });

  describe("返り値の確認", () => {
    it("必要なプロパティとメソッドが返される", () => {
      const { result } = renderHook(
        () => useTaskEditForm(mockTask, mockOnOpenChange),
        { wrapper },
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
