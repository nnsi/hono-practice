import type { ReactNode } from "react";

import { useActivityLogSync } from "@frontend/hooks/sync/useActivityLogSync";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import {
  createMockNetworkStatus,
  renderHookWithActSync as renderHookWithAct,
  waitForWithAct,
} from "@frontend/test-utils";
import { apiClient } from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityBatchData } from "../useActivityBatchData";

// useActivityLogSyncのモック
vi.mock("@frontend/hooks/sync/useActivityLogSync", () => ({
  useActivityLogSync: vi.fn(),
}));

// useNetworkStatusContextのモック
vi.mock("@frontend/providers/NetworkStatusProvider", () => ({
  useNetworkStatusContext: vi.fn(),
}));

// モック
vi.mock("@frontend/utils/apiClient", () => {
  const mockApiClient = {
    batch: {
      $post: vi.fn(),
    },
  };
  return {
    apiClient: mockApiClient,
  };
});

// useToastのモック
const mockToast = vi.fn();
vi.mock("@frontend/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useActivityBatchData", () => {
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

    // デフォルトのuseActivityLogSyncモック
    vi.mocked(useActivityLogSync).mockReturnValue({
      mergedActivityLogs: [],
      isOfflineData: () => false,
    });
  });

  const createWrapper = (isOnline = true) => {
    const mockNetworkStatus = createMockNetworkStatus({ isOnline });
    vi.mocked(useNetworkStatusContext).mockReturnValue(mockNetworkStatus);

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("オンライン時にバッチAPIでデータを取得する", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");

    const mockActivities = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "ランニング",
        emoji: "🏃",
        description: "Running activity",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "読書",
        emoji: "📚",
        description: "Reading activity",
        quantityUnit: "ページ",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    const mockActivityLogs = [
      {
        id: "00000000-0000-4000-8000-000000000003",
        date: "2024-01-15",
        quantity: 30,
        memo: "Test memo",
        activity: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "ランニング",
          quantityUnit: "分",
          emoji: "🏃",
        },
        activityKind: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        date: "2024-01-15",
        quantity: 30,
        memo: "Test memo",
        activity: {
          id: "00000000-0000-4000-8000-000000000002",
          name: "読書",
          quantityUnit: "ページ",
          emoji: "📚",
        },
        activityKind: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
    ];

    vi.mocked(mockApiClient.batch.$post).mockImplementation(async () => {
      console.log("batch.$post called");
      return {
        ok: true,
        json: async () => {
          console.log("json() called, returning:", [
            mockActivities,
            mockActivityLogs,
          ]);
          return [mockActivities, mockActivityLogs];
        },
      } as any;
    });

    vi.mocked(useActivityLogSync).mockReturnValue({
      mergedActivityLogs: mockActivityLogs,
      isOfflineData: () => false,
    });

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    // APIが呼ばれるまで待つ
    await waitForWithAct(() => {
      expect(mockApiClient.batch.$post).toHaveBeenCalled();
    });

    await waitForWithAct(() => {
      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.activityLogs).toEqual(mockActivityLogs);
    });

    // バッチAPIが正しいパラメータで呼ばれたことを確認
    expect(mockApiClient.batch.$post).toHaveBeenCalledWith({
      json: [
        { path: "/users/activities" },
        { path: `/users/activity-logs?date=${dateStr}` },
      ],
    });

    // useActivityLogSyncが正しく呼ばれたことを確認（2回目の呼び出しをチェック）
    expect(useActivityLogSync).toHaveBeenNthCalledWith(2, {
      date,
      isOnline: true,
      activityLogs: expect.arrayContaining([
        expect.objectContaining({
          id: "00000000-0000-4000-8000-000000000003",
          activity: expect.objectContaining({
            id: "00000000-0000-4000-8000-000000000001",
          }),
        }),
      ]),
    });
  });

  it("オフライン時はAPIを呼び出さない", () => {
    const date = new Date("2024-01-15");

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(false),
    });

    expect(mockApiClient.batch.$post).not.toHaveBeenCalled();
    expect(result.current.activities).toEqual([]);
    expect(result.current.activityLogs).toEqual([]);
  });

  it("個別のキャッシュも更新される", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");

    const mockActivities = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Test Activity",
        emoji: "🏃",
        description: "Test activity description",
        quantityUnit: "分",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    const mockActivityLogs = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        date: "2024-01-15",
        quantity: 30,
        memo: "Test memo",
        activity: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Test Activity",
          quantityUnit: "分",
          emoji: "🏃",
        },
        activityKind: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
    ];

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([mockActivities, mockActivityLogs]),
    } as any);

    vi.mocked(useActivityLogSync).mockReturnValue({
      mergedActivityLogs: mockActivityLogs,
      isOfflineData: () => false,
    });

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    // APIが呼ばれてデータが返されるまで待つ
    await waitForWithAct(() => {
      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.activityLogs).toEqual(mockActivityLogs);
    });

    // 個別のキャッシュが更新されていることを確認
    const cachedActivities = queryClient.getQueryData(["activity"]);
    const cachedActivityLogs = queryClient.getQueryData([
      "activity-logs-daily",
      dateStr,
    ]);

    expect(cachedActivities).toEqual(mockActivities);
    expect(cachedActivityLogs).toEqual([
      expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000002",
        date: "2024-01-15",
        quantity: 30,
        memo: "Test memo",
        activity: expect.objectContaining({
          id: "00000000-0000-4000-8000-000000000001",
          name: "Test Activity",
        }),
      }),
    ]);
  });

  it("hasActivityLogsヘルパー関数が正しく動作する", async () => {
    const date = new Date("2024-01-15");
    const activityId = "00000000-0000-4000-8000-000000000001";

    const mockActivityLog = {
      id: "00000000-0000-4000-8000-000000000002",
      date: "2024-01-15",
      quantity: 30,
      memo: "Test memo",
      activity: {
        id: activityId,
        name: "Test Activity",
        quantityUnit: "分",
        emoji: "🏃",
      },
      activityKind: null,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    };

    // activity をモックに含める
    const mockActivityLogWithActivity = mockActivityLog;

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      json: vi.fn().mockResolvedValue([[], [mockActivityLog]]),
    } as any);

    vi.mocked(useActivityLogSync).mockReturnValue({
      mergedActivityLogs: [mockActivityLogWithActivity],
      isOfflineData: () => false,
    });

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    await waitForWithAct(() => {
      expect(result.current.hasActivityLogs(activityId)).toBe(true);
      expect(
        result.current.hasActivityLogs("00000000-0000-4000-8000-999999999999"),
      ).toBe(false);
    });
  });

  it("エラー時にトーストを表示する", async () => {
    const date = new Date("2024-01-15");

    vi.mocked(mockApiClient.batch.$post).mockRejectedValue(
      new Error("Network error"),
    );

    renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    await waitForWithAct(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      });
    });
  });

  it("アクティビティのパースエラー時に例外をスローする", async () => {
    const date = new Date("2024-01-15");

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      json: vi.fn().mockResolvedValue([
        { invalid: "data" }, // 不正なアクティビティデータ
        { activityLogs: [] },
      ]),
    } as any);

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    await waitForWithAct(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe("Failed to parse activities");
    });
  });

  it("アクティビティログのパースエラー時に例外をスローする", async () => {
    const date = new Date("2024-01-15");

    const mockActivities = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Test Activity",
        emoji: "🏃",
        description: "Test description",
        quantityUnit: "回",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      json: vi.fn().mockResolvedValue([
        mockActivities,
        { invalid: "data" }, // 不正なアクティビティログデータ
      ]),
    } as any);

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    await waitForWithAct(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe(
        "Failed to parse activity logs",
      );
    });
  });

  it("isOfflineData関数が正しく機能する", async () => {
    const date = new Date("2024-01-15");

    const mockActivityLog = {
      id: "00000000-0000-4000-8000-000000000001",
      date: "2024-01-15",
      quantity: 30,
      memo: "Test memo",
      activity: {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Test Activity",
        quantityUnit: "分",
        emoji: "🏃",
      },
      activityKind: null,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    };

    const mockIsOfflineData = vi.fn(
      (log: any) => log.id === mockActivityLog.id,
    );

    vi.mocked(useActivityLogSync).mockReturnValue({
      mergedActivityLogs: [mockActivityLog],
      isOfflineData: mockIsOfflineData,
    });

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      json: vi.fn().mockResolvedValue([[], []]),
    } as any);

    const { result } = renderHookWithAct(() => useActivityBatchData({ date }), {
      wrapper: createWrapper(true),
    });

    await waitForWithAct(() => {
      expect(result.current.isOfflineData).toBe(mockIsOfflineData);
      expect(result.current.isOfflineData(mockActivityLog)).toBe(true);
    });
  });

  it("日付が変更された時に新しいデータを取得する", async () => {
    const date1 = new Date("2024-01-15");
    const date2 = new Date("2024-01-16");
    const dateStr1 = dayjs(date1).format("YYYY-MM-DD");
    const dateStr2 = dayjs(date2).format("YYYY-MM-DD");

    vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
      json: vi.fn().mockResolvedValue([[], []]),
    } as any);

    const { rerender } = renderHookWithAct(
      ({ date }: { date: Date }) => useActivityBatchData({ date }),
      {
        wrapper: createWrapper(true),
        initialProps: { date: date1 },
      },
    );

    await waitForWithAct(() => {
      expect(mockApiClient.batch.$post).toHaveBeenCalledWith({
        json: [
          { path: "/users/activities" },
          { path: `/users/activity-logs?date=${dateStr1}` },
        ],
      });
    });

    // 日付を変更
    rerender({ date: date2 });

    await waitForWithAct(() => {
      expect(mockApiClient.batch.$post).toHaveBeenCalledWith({
        json: [
          { path: "/users/activities" },
          { path: `/users/activity-logs?date=${dateStr2}` },
        ],
      });
    });

    expect(mockApiClient.batch.$post).toHaveBeenCalledTimes(2);
  });
});
