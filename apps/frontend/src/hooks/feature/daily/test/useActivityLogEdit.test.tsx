import type React from "react";

import * as toast from "@components/ui";
import type {
  GetActivitiesResponse,
  GetActivityLogResponse,
} from "@dtos/response";
import * as syncedActivityLog from "@frontend/hooks/api/useActivityLogs";
import * as apiClient from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityLogEdit } from "../useActivityLogEdit";

// モックの設定
vi.mock("@frontend/hooks/api/useActivityLogs");
vi.mock("@frontend/utils");
vi.mock("@components/ui");

describe("useActivityLogEdit", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockToast = vi.fn();
  const mockUpdateActivityLog = vi.fn();
  const mockDeleteActivityLog = vi.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockLog: GetActivityLogResponse = {
    id: "00000000-0000-4000-8000-000000000001",
    activity: {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Reading",
      emoji: "📚",
      quantityUnit: "pages",
    },
    activityKind: {
      id: "00000000-0000-4000-8000-000000000201",
      name: "Fiction",
    },
    quantity: 50,
    memo: "Great book!",
    date: "2025-01-20",
    createdAt: new Date("2025-01-20T10:00:00Z"),
    updatedAt: new Date("2025-01-20T10:00:00Z"),
  };

  const mockActivities: GetActivitiesResponse = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Reading",
      emoji: "📚",
      iconType: "emoji",
      quantityUnit: "pages",
      kinds: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          name: "Fiction",
        },
        {
          id: "00000000-0000-4000-8000-000000000202",
          name: "Non-fiction",
        },
      ],
      showCombinedStats: false,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useToastのモック
    vi.mocked(toast.useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    // useUpdateActivityLogのモック
    vi.mocked(syncedActivityLog.useUpdateActivityLog).mockReturnValue({
      mutateAsync: mockUpdateActivityLog,
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      isIdle: true,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);

    // useDeleteActivityLogのモック
    vi.mocked(syncedActivityLog.useDeleteActivityLog).mockReturnValue({
      mutateAsync: mockDeleteActivityLog,
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      isIdle: true,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);

    // apiClientのモック
    const mockApiClient = {
      users: {
        activities: {
          $get: vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue(mockActivities),
          }),
        },
      },
    };

    vi.mocked(apiClient).apiClient = mockApiClient as any;
  });

  it("ログデータから初期値が正しく設定される", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    expect(result.current.memo).toBe("Great book!");
    expect(result.current.quantity).toBe(50);
    expect(result.current.activityKindId).toBe(
      "00000000-0000-4000-8000-000000000201",
    );
  });

  it("ログデータがnullの場合、初期値が空になる", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, null),
      { wrapper },
    );

    expect(result.current.memo).toBe("");
    expect(result.current.quantity).toBeNull();
    expect(result.current.activityKindId).toBe("");
  });

  it("メモを変更できる", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    act(() => {
      result.current.handleMemoChange({
        target: { value: "Updated memo" },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    expect(result.current.memo).toBe("Updated memo");
  });

  it("数量を変更できる", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    act(() => {
      result.current.handleQuantityChange({
        target: { value: "75" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.quantity).toBe(75);
  });

  it("数量を空にするとnullになる", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    act(() => {
      result.current.handleQuantityChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.quantity).toBeNull();
  });

  it("アクティビティ種別を変更できる", () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    act(() => {
      result.current.handleActivityKindChange(
        "00000000-0000-4000-8000-000000000202",
      );
    });

    expect(result.current.activityKindId).toBe(
      "00000000-0000-4000-8000-000000000202",
    );
  });

  it("保存処理が正しく動作する", async () => {
    mockUpdateActivityLog.mockResolvedValue({});

    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockUpdateActivityLog).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000001",
      data: {
        memo: "Great book!",
        quantity: 50,
        activityKindId: "00000000-0000-4000-8000-000000000201",
      },
      date: "2025-01-20",
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "保存しました",
      variant: "default",
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("保存処理でエラーが発生した場合、エラートーストが表示される", async () => {
    mockUpdateActivityLog.mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "保存に失敗しました",
      variant: "destructive",
    });
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("削除処理が正しく動作する", async () => {
    mockDeleteActivityLog.mockResolvedValue({});

    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockDeleteActivityLog).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000001",
      date: "2025-01-20",
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "削除しました",
      variant: "default",
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("削除処理でエラーが発生した場合、エラートーストが表示される", async () => {
    mockDeleteActivityLog.mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "削除に失敗しました",
      variant: "destructive",
    });
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("ログがnullの場合、保存・削除処理が実行されない", async () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, null),
      { wrapper },
    );

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockUpdateActivityLog).not.toHaveBeenCalled();
    expect(mockDeleteActivityLog).not.toHaveBeenCalled();
  });

  it("アクティビティ情報を正しく取得できる", async () => {
    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    // 初期状態ではlogの情報が使われる（APIがまだ呼ばれていない）
    expect(result.current.activity).toEqual({
      id: "00000000-0000-4000-8000-000000000101",
      name: "Reading",
      quantityUnit: "pages",
      emoji: "📚",
      iconType: "emoji",
      kinds: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          name: "Fiction",
        },
      ],
    });

    // APIからデータが取得されるのを待つ
    await waitFor(() => {
      expect(apiClient.apiClient.users.activities.$get).toHaveBeenCalled();
    });
  });

  it("オフライン時はログに含まれるアクティビティ情報を使用する", () => {
    // APIからのアクティビティ取得が失敗する状況をシミュレート
    vi.mocked(apiClient).apiClient.users.activities.$get = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () => useActivityLogEdit(true, mockOnOpenChange, mockLog),
      { wrapper },
    );

    expect(result.current.activity).toEqual({
      id: "00000000-0000-4000-8000-000000000101",
      name: "Reading",
      quantityUnit: "pages",
      emoji: "📚",
      iconType: "emoji",
      kinds: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          name: "Fiction",
        },
      ],
    });
  });

  it("ログが変更されると値がリセットされる", () => {
    const { result, rerender } = renderHook(
      ({ log }) => useActivityLogEdit(true, mockOnOpenChange, log),
      {
        wrapper,
        initialProps: { log: mockLog },
      },
    );

    const newLog: GetActivityLogResponse = {
      ...mockLog,
      id: "00000000-0000-4000-8000-000000000002",
      memo: "New memo",
      quantity: 100,
      activityKind: undefined,
    };

    rerender({ log: newLog });

    expect(result.current.memo).toBe("New memo");
    expect(result.current.quantity).toBe(100);
    expect(result.current.activityKindId).toBe("");
  });
});
