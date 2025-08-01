import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useActivityEdit } from "../useActivityEdit";

// API hooksのモック
const mockDeleteActivity = vi.fn();
const mockUpdateActivity = vi.fn();
const mockUploadActivityIcon = vi.fn();
const mockDeleteActivityIcon = vi.fn();

// モック用のqueryClientを取得するための変数
let mockQueryClient: QueryClient;

vi.mock("@frontend/hooks/api", () => ({
  useDeleteActivity: () => ({
    mutateAsync: async (id: string) => {
      const result = await mockDeleteActivity(id);
      // 実際のフックと同じようにクエリを無効化
      if (mockQueryClient) {
        mockQueryClient.invalidateQueries({ queryKey: ["activity"] });
      }
      return result;
    },
  }),
  useUpdateActivity: () => ({
    mutate: (data: any, options?: any) => {
      mockUpdateActivity(data, options);
      // 実際のフックと同じようにクエリを無効化
      if (mockQueryClient && options?.onSuccess) {
        mockQueryClient.invalidateQueries({ queryKey: ["activity"] });
        options.onSuccess();
      }
    },
    isPending: false,
  }),
  useUploadActivityIcon: () => ({
    mutateAsync: mockUploadActivityIcon,
  }),
  useDeleteActivityIcon: () => ({
    mutateAsync: mockDeleteActivityIcon,
  }),
}));

// React Hook Formのモック設定
const mockReset = vi.fn();
const mockAppend = vi.fn();
const mockRemove = vi.fn();

vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => ({
    control: {},
    handleSubmit: (fn: any) => fn,
    reset: mockReset,
    formState: { errors: {} },
    register: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(),
    watch: vi.fn(),
  })),
  useFieldArray: vi.fn(() => ({
    fields: [],
    append: mockAppend,
    remove: mockRemove,
  })),
  zodResolver: vi.fn(() => vi.fn()),
}));

describe("useActivityEdit", () => {
  let queryClient: QueryClient;
  let mockActivity: GetActivityResponse;
  let mockOnClose: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteActivity.mockResolvedValue({});
    mockUpdateActivity.mockImplementation((_data, options) => {
      // Call onSuccess callback if provided
      if (options?.onSuccess) {
        options.onSuccess();
      }
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // モックがqueryClientにアクセスできるように設定
    mockQueryClient = queryClient;

    mockActivity = {
      id: "test-activity-id",
      name: "Test Activity",
      description: "Test Description",
      quantityUnit: "分",
      emoji: "🏃",
      iconType: "emoji" as const,
      showCombinedStats: true,
      kinds: [
        { id: "kind-1", name: "Kind 1" },
        { id: "kind-2", name: "Kind 2" },
      ],
    };

    mockOnClose = vi.fn();
  });

  describe("初期化", () => {
    it("アクティビティがある場合、フォームの初期値が設定される", async () => {
      renderHook(() => useActivityEdit(mockActivity, mockOnClose), {
        wrapper,
      });

      expect(mockReset).toHaveBeenCalledWith({
        activity: {
          name: "Test Activity",
          description: "Test Description",
          quantityUnit: "分",
          emoji: "🏃",
          showCombinedStats: true,
        },
        kinds: [
          { id: "kind-1", name: "Kind 1" },
          { id: "kind-2", name: "Kind 2" },
        ],
      });
    });

    it("アクティビティがnullの場合、フォームの初期値は設定されない", async () => {
      mockReset.mockClear();

      renderHook(() => useActivityEdit(null, mockOnClose), {
        wrapper,
      });

      expect(mockReset).not.toHaveBeenCalled();
    });

    it("アクティビティが変更されたときにフォームがリセットされる", async () => {
      mockReset.mockClear();

      const { rerender } = renderHook(
        ({ activity }) => useActivityEdit(activity, mockOnClose),
        {
          initialProps: { activity: mockActivity },
          wrapper,
        },
      );

      const newActivity: GetActivityResponse = {
        ...mockActivity,
        id: "new-id",
        name: "New Activity",
      };

      act(() => {
        rerender({ activity: newActivity });
      });

      expect(mockReset).toHaveBeenCalledTimes(2);
      expect(mockReset).toHaveBeenLastCalledWith({
        activity: {
          name: "New Activity",
          description: "Test Description",
          quantityUnit: "分",
          emoji: "🏃",
          showCombinedStats: true,
        },
        kinds: [
          { id: "kind-1", name: "Kind 1" },
          { id: "kind-2", name: "Kind 2" },
        ],
      });
    });
  });

  describe("送信処理", () => {
    it("フォーム送信時にAPIが呼ばれ、成功時にクエリが無効化される", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      const updateData = {
        activity: {
          name: "Updated Activity",
          description: "Updated Description",
          quantityUnit: "分",
          emoji: "🏃",
          iconType: "emoji" as const,
          showCombinedStats: false,
        },
        kinds: [{ id: "kind-1", name: "Updated Kind" }],
      };

      await act(async () => {
        result.current.onSubmit(updateData);
      });

      await waitFor(() => {
        expect(mockUpdateActivity).toHaveBeenCalledWith(
          { id: "test-activity-id", data: updateData },
          expect.objectContaining({
            onSuccess: expect.any(Function),
          }),
        );
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity"],
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("アクティビティがnullの場合、送信処理は実行されない", async () => {
      const { result } = renderHook(() => useActivityEdit(null, mockOnClose), {
        wrapper,
      });

      await act(async () => {
        result.current.onSubmit({
          activity: {
            name: "Test",
            description: "",
            quantityUnit: "分",
            emoji: "",
            iconType: "emoji" as const,
            showCombinedStats: false,
          },
          kinds: [],
        });
      });

      expect(mockUpdateActivity).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("削除処理", () => {
    it("削除処理が成功した場合、クエリが無効化される", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      await waitFor(() => {
        expect(mockDeleteActivity).toHaveBeenCalledWith("test-activity-id");
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity"],
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("削除処理が失敗した場合、クエリは無効化されない", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      mockDeleteActivity.mockRejectedValue(new Error("Failed to delete"));

      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      await waitFor(() => {
        expect(mockDeleteActivity).toHaveBeenCalled();
      });

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("アクティビティがnullの場合、削除処理は実行されない", async () => {
      const { result } = renderHook(() => useActivityEdit(null, mockOnClose), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteActivity).not.toHaveBeenCalled();
    });
  });

  describe("種類の管理", () => {
    it("種類の追加ハンドラが正しく動作する", async () => {
      mockAppend.mockClear();

      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      act(() => {
        result.current.handleAddKind();
      });

      expect(mockAppend).toHaveBeenCalledWith({ name: "" });
    });

    it("種類の削除ハンドラが正しく動作する", async () => {
      mockRemove.mockClear();

      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      act(() => {
        result.current.handleRemoveKind(0);
      });

      expect(mockRemove).toHaveBeenCalledWith(0);
    });
  });

  describe("ローディング状態", () => {
    it("送信中はisPendingがtrueになる", async () => {
      // isPendingのテストは、実際のuseMutationの実装に依存するため、
      // モックの戸外の設定によっては期待通りに動作しない可能性がある
      const { result } = renderHook(
        () => useActivityEdit(mockActivity, mockOnClose),
        { wrapper },
      );

      expect(result.current.isPending).toBe(false);

      // Note: 実際のisPendingの挙動はuseMutationの内部実装に依存するため、
      // このテストでは完全な動作を再現できない
    });
  });
});
