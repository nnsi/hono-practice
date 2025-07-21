import type { ReactNode } from "react";

import { apiClient } from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActivities } from "../useActivities";

// apiClientのモック
vi.mock("@frontend/utils", () => ({
  apiClient: {
    users: {
      activities: {
        $get: vi.fn(),
      },
    },
  },
}));

describe("useActivities", () => {
  let queryClient: QueryClient;
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("アクティビティ一覧を正常に取得する", async () => {
    const mockActivities = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "ランニング",
        emoji: "🏃",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "読書",
        emoji: "📚",
        quantityUnit: "ページ",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        name: "筋トレ",
        emoji: "💪",
        quantityUnit: "回",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    mockApiClient.users.activities.$get.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivities),
    } as any);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    // 初期状態を確認
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // APIが呼ばれたことを確認
    expect(mockApiClient.users.activities.$get).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // データが正しく取得されていることを確認
    expect(result.current.data).toEqual(mockActivities);
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].name).toBe("ランニング");
  });

  it("空の配列を返す場合も正常に処理する", async () => {
    mockApiClient.users.activities.$get.mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    } as any);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.data).toHaveLength(0);
  });

  it("APIエラー時にエラー状態になる", async () => {
    const mockError = new Error("Network error");
    mockApiClient.users.activities.$get.mockRejectedValue(mockError);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeUndefined();
  });

  it("パースエラー時に例外をスローする", async () => {
    // 不正なデータ構造を返す
    mockApiClient.users.activities.$get.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        invalid: "data",
        structure: "that should fail parsing",
      }),
    } as any);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to parse activities");
  });

  it("キャッシュキーが正しく設定される", async () => {
    const mockActivities = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Test Activity",
        emoji: "🏃",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    mockApiClient.users.activities.$get.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivities),
    } as any);

    renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // キャッシュにデータが保存されていることを確認
      const cachedData = queryClient.getQueryData(["activity"]);
      expect(cachedData).toEqual(mockActivities);
    });
  });

  it("再フェッチが正しく動作する", async () => {
    const mockActivities1 = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "初回データ",
        emoji: "🏃",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    const mockActivities2 = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "更新データ",
        emoji: "🏃",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "新規追加",
        emoji: "📚",
        quantityUnit: "ページ",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    mockApiClient.users.activities.$get
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue(mockActivities1),
      } as any)
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue(mockActivities2),
      } as any);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    // 初回データ取得を待つ
    await waitFor(() => {
      expect(result.current.data).toEqual(mockActivities1);
    });

    // 再フェッチ
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual(mockActivities2);
    });

    expect(mockApiClient.users.activities.$get).toHaveBeenCalledTimes(2);
  });
});
