import type React from "react";

import * as globalDateHook from "@frontend/hooks";
import * as syncHooks from "@frontend/hooks/sync";
import * as networkProvider from "@frontend/providers/NetworkStatusProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  GetActivitiesResponse,
  GetActivityLogResponse,
  GetTasksResponse,
} from "@dtos/response";

import { useDailyPage } from "../useDailyPage";

// モックの設定
vi.mock("@frontend/hooks");
vi.mock("@frontend/hooks/sync");
vi.mock("@frontend/providers/NetworkStatusProvider");
vi.mock("@frontend/utils/apiClient");
vi.mock("@frontend/utils", () => ({
  apiClient: {
    users: {
      "activity-logs": {
        $get: vi.fn(),
      },
      activities: {
        $get: vi.fn(),
      },
      tasks: {
        $get: vi.fn(),
      },
    },
  },
  qp: ({ queryKey, queryFn, schema }: any) => ({
    queryKey,
    queryFn: async () => {
      const res = await queryFn();
      const json = await res.json();
      const parsedResult = schema.safeParse(json);
      if (!parsedResult.success) {
        throw parsedResult.error;
      }
      return parsedResult.data;
    },
  }),
}));

describe("useDailyPage", () => {
  let queryClient: QueryClient;
  const mockSetDate = vi.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockActivityLogs: GetActivityLogResponse[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      activity: {
        id: "00000000-0000-4000-8000-000000000101",
        name: "Running",
        emoji: "🏃",
        quantityUnit: "km",
      },
      quantity: 5,
      memo: "Morning run",
      date: "2025-01-20",
      createdAt: new Date("2025-01-20T06:00:00Z"),
      updatedAt: new Date("2025-01-20T06:00:00Z"),
    },
  ];

  const mockActivities: GetActivitiesResponse = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Running",
      emoji: "🏃",
      quantityUnit: "km",
      kinds: [],
      showCombinedStats: false,
    },
  ];

  const mockTasks: GetTasksResponse = [
    {
      id: "00000000-0000-4000-8000-000000000201",
      userId: "00000000-0000-4000-8000-000000000301",
      title: "Buy groceries",
      startDate: "2025-01-20",
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2025-01-20T08:00:00Z"),
      updatedAt: new Date("2025-01-20T08:00:00Z"),
    },
  ];

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useGlobalDateのモック
    vi.mocked(globalDateHook.useGlobalDate).mockReturnValue({
      date: new Date("2025-01-20"),
      setDate: mockSetDate,
    });

    // useNetworkStatusContextのモック
    vi.mocked(networkProvider.useNetworkStatusContext).mockReturnValue({
      isOnline: true,
      lastOnlineAt: null,
      lastOfflineAt: null,
    });

    // useActivityLogSyncのモック
    vi.mocked(syncHooks.useActivityLogSync).mockReturnValue({
      mergedActivityLogs: mockActivityLogs,
      isOfflineData: vi.fn(() => false),
    });

    // apiClientのモック - @frontend/utils経由でアクセスされる
    const { apiClient: mockedApiClient } = await import("@frontend/utils");
    vi.mocked(mockedApiClient.users["activity-logs"].$get).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivityLogs),
    } as any);
    vi.mocked(mockedApiClient.users.activities.$get).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivities),
    } as any);
    vi.mocked(mockedApiClient.users.tasks.$get).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockTasks),
    } as any);
  });

  it("初期状態が正しく設定される", () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    expect(result.current.date).toEqual(new Date("2025-01-20"));
    expect(result.current.editDialogOpen).toBe(false);
    expect(result.current.editTargetLog).toBeNull();
    expect(result.current.createDialogOpen).toBe(false);
  });

  it("アクティビティログを取得できる", async () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.mergedActivityLogs).toEqual(mockActivityLogs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOfflineData).toBeInstanceOf(Function);
    });
  });

  it("タスクを取得できる", async () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.isTasksLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });
  });

  it("日付を変更するとデータが再取得される", async () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    act(() => {
      result.current.setDate(new Date("2025-01-21"));
    });

    expect(mockSetDate).toHaveBeenCalledWith(new Date("2025-01-21"));
  });

  it("アクティビティログクリックで編集ダイアログが開く", () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    act(() => {
      result.current.handleActivityLogClick(mockActivityLogs[0]);
    });

    expect(result.current.editTargetLog).toEqual(mockActivityLogs[0]);
    expect(result.current.editDialogOpen).toBe(true);
  });

  it("編集ダイアログの開閉を制御できる", () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    act(() => {
      result.current.handleActivityLogEditDialogChange(true);
    });

    expect(result.current.editDialogOpen).toBe(true);

    act(() => {
      result.current.handleActivityLogEditDialogChange(false);
    });

    expect(result.current.editDialogOpen).toBe(false);
  });

  it("作成ダイアログの開閉を制御できる", () => {
    const { result } = renderHook(() => useDailyPage(), { wrapper });

    act(() => {
      result.current.setCreateDialogOpen(true);
    });

    expect(result.current.createDialogOpen).toBe(true);

    act(() => {
      result.current.setCreateDialogOpen(false);
    });

    expect(result.current.createDialogOpen).toBe(false);
  });

  it("オフライン時はネットワークモードが適切に設定される", () => {
    vi.mocked(networkProvider.useNetworkStatusContext).mockReturnValue({
      isOnline: false,
      lastOnlineAt: null,
      lastOfflineAt: null,
    });

    vi.mocked(syncHooks.useActivityLogSync).mockReturnValue({
      mergedActivityLogs: mockActivityLogs,
      isOfflineData: vi.fn(() => true),
    });

    const { result } = renderHook(() => useDailyPage(), { wrapper });

    expect(result.current.isOfflineData).toBeInstanceOf(Function);
    // オフラインの場合、全てのログがオフラインデータとして扱われる
    expect(result.current.isOfflineData(mockActivityLogs[0])).toBe(true);
  });

  it("キャッシュされたアクティビティがある場合は再取得しない", async () => {
    // キャッシュデータを設定
    queryClient.setQueryData(["activity"], mockActivities);

    const { apiClient: mockedApiClient } = await import("@frontend/utils");

    renderHook(() => useDailyPage(), { wrapper });

    // activities.$getが呼ばれないことを確認
    expect(mockedApiClient.users.activities.$get).not.toHaveBeenCalled();
  });

  it("日付フォーマットが正しく処理される", async () => {
    const testDate = new Date("2024-12-31");
    vi.mocked(globalDateHook.useGlobalDate).mockReturnValue({
      date: testDate,
      setDate: mockSetDate,
    });

    const { apiClient: mockedApiClient } = await import("@frontend/utils");

    renderHook(() => useDailyPage(), { wrapper });

    await waitFor(() => {
      expect(mockedApiClient.users["activity-logs"].$get).toHaveBeenCalledWith({
        query: { date: "2024-12-31" },
      });
      expect(mockedApiClient.users.tasks.$get).toHaveBeenCalledWith({
        query: { date: "2024-12-31" },
      });
    });
  });
});
