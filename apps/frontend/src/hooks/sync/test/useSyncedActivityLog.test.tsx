import { act } from "react";
import type { ReactNode } from "react";

import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import {
  createMockNetworkStatus,
  renderHookWithActSync as renderHookWithAct,
} from "@frontend/test-utils";
import { apiClient } from "@frontend/utils/apiClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCreateActivityLog,
  useDeleteActivityLog,
  useUpdateActivityLog,
} from "../useSyncedActivityLog";

// useNetworkStatusContextのインポートとモック
vi.mock("@frontend/providers/NetworkStatusProvider");

// apiClientのモック
vi.mock("@frontend/utils/apiClient", () => {
  const createMockApiClient = () => ({
    users: {
      "activity-logs": {
        $post: vi.fn(),
        ":id": {
          $put: vi.fn(),
          $delete: vi.fn(),
        },
      },
    },
  });

  return { apiClient: createMockApiClient() };
});

// uuidのモック
vi.mock("uuid", () => ({
  v4: vi.fn(() => "00000000-0000-4000-8000-000000000001"),
}));

// グローバル変数でネットワーク状態を管理
const globalNetworkStatus = { isOnline: true };

// useSyncedMutationのモック
vi.mock("../useSyncedMutation", () => ({
  useSyncedMutation: vi.fn((options: any) => {
    return {
      mutate: vi.fn((variables: any) => {
        if (options.onMutate) {
          options.onMutate(variables);
        }

        // グローバル変数からネットワーク状態を取得
        const isOnline = globalNetworkStatus.isOnline;

        if (isOnline) {
          return options
            .onlineAction(variables)
            .then((result: any) => {
              if (options.onSuccess) {
                options.onSuccess(result, variables, {});
              }
              return result;
            })
            .catch((error: any) => {
              if (options.onError) {
                options.onError(error, variables, {});
              }
              throw error;
            });
        }
        if (options.offlineAction) {
          const result = options.offlineAction(variables);
          if (options.onSuccess) {
            options.onSuccess(result, variables, {});
          }
          return Promise.resolve(result);
        }
      }),
      mutateAsync: vi.fn(async (variables: any) => {
        // mutateAsyncの実装（必要に応じて）
        const isOnline = globalNetworkStatus.isOnline;

        if (isOnline && options.onlineAction) {
          return options.onlineAction(variables);
        }
        if (!isOnline && options.offlineAction) {
          return options.offlineAction(variables);
        }
        throw new Error("No appropriate action defined");
      }),
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: null,
    };
  }),
}));

describe("useCreateActivityLog", () => {
  let queryClient: QueryClient;
  let originalDispatchEvent: typeof window.dispatchEvent;

  beforeEach(() => {
    // グローバルネットワーク状態をリセット
    globalNetworkStatus.isOnline = true;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: true }),
    );
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    window.dispatchEvent = originalDispatchEvent;
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("オンライン時に活動記録を作成できる", async () => {
    const mockResponseData = {
      id: "created-123",
      date: "2024-01-15",
      quantity: 30,
    };

    vi.mocked(apiClient.users["activity-logs"].$post).mockResolvedValue(
      Response.json(mockResponseData, { status: 200 }) as any,
    );

    const { result } = renderHookWithAct(() => useCreateActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        activityId: "activity-123",
        date: "2024-01-15",
        quantity: 30,
        memo: "テストメモ",
      });
    });

    expect(apiClient.users["activity-logs"].$post).toHaveBeenCalledWith({
      json: {
        activityId: "activity-123",
        date: "2024-01-15",
        quantity: 30,
        memo: "テストメモ",
      },
    });
  });

  it("オフライン時にローカルストレージに保存される", async () => {
    globalNetworkStatus.isOnline = false;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );

    const { result } = renderHookWithAct(() => useCreateActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        activityId: "activity-123",
        date: "2024-01-15",
        quantity: 30,
        activityInfo: {
          name: "ランニング",
          quantityUnit: "分",
          emoji: "🏃",
        },
      });
    });

    const storedData = JSON.parse(
      localStorage.getItem("offline-activity-logs-2024-01-15") || "[]",
    );
    expect(storedData).toHaveLength(1);
    expect(storedData[0]).toMatchObject({
      activity: {
        id: "activity-123",
        name: "ランニング",
        quantityUnit: "分",
        emoji: "🏃",
      },
      quantity: 30,
    });

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      new Event("offline-data-updated"),
    );
  });

  it("楽観的更新が正しく動作する", async () => {
    const dateKey = ["activity-logs-daily", "2024-01-15"];
    queryClient.setQueryData(dateKey, []);

    const { result } = renderHookWithAct(() => useCreateActivityLog(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        activityId: "activity-123",
        date: "2024-01-15",
        quantity: 30,
        activityInfo: {
          name: "ランニング",
          quantityUnit: "分",
          emoji: "🏃",
        },
      });
    });

    // 楽観的更新の確認
    const updatedData = queryClient.getQueryData(dateKey) as any[];
    expect(updatedData).toHaveLength(1);
    expect(updatedData[0].id).toMatch(/^optimistic-/);
    expect(updatedData[0].quantity).toBe(30);
  });
});

describe("useUpdateActivityLog", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    globalNetworkStatus.isOnline = true;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: true }),
    );
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("オンライン時に活動記録を更新できる", async () => {
    const mockResponseData = {
      id: "log-123",
      quantity: 45,
    };

    vi.mocked(apiClient.users["activity-logs"][":id"].$put).mockResolvedValue(
      Response.json(mockResponseData, { status: 200 }) as any,
    );

    const { result } = renderHookWithAct(() => useUpdateActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "log-123",
        quantity: 45,
        memo: "更新されたメモ",
      });
    });

    expect(apiClient.users["activity-logs"][":id"].$put).toHaveBeenCalledWith({
      param: { id: "log-123" },
      json: {
        quantity: 45,
        memo: "更新されたメモ",
      },
    });
  });

  it("楽観的更新が正しく動作する", async () => {
    const dateKey = ["activity-logs-daily", "2024-01-15"];
    const existingLog = {
      id: "log-123",
      date: "2024-01-15",
      quantity: 30,
      memo: "元のメモ",
    };

    queryClient.setQueryData(dateKey, [existingLog]);

    const { result } = renderHookWithAct(() => useUpdateActivityLog(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: "log-123",
        date: "2024-01-15",
        quantity: 45,
        memo: "更新されたメモ",
      });
    });

    // 楽観的更新の確認
    const updatedData = queryClient.getQueryData(dateKey) as any[];
    expect(updatedData[0].quantity).toBe(45);
    expect(updatedData[0].memo).toBe("更新されたメモ");
  });

  it("オフライン時にオフラインアクションが実行される", async () => {
    globalNetworkStatus.isOnline = false;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );

    const { result } = renderHookWithAct(() => useUpdateActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "log-123",
        quantity: 45,
      });
    });

    // APIが呼ばれないことを確認
    expect(apiClient.users["activity-logs"][":id"].$put).not.toHaveBeenCalled();
  });
});

describe("useDeleteActivityLog", () => {
  let queryClient: QueryClient;
  let originalDispatchEvent: typeof window.dispatchEvent;

  beforeEach(() => {
    // グローバルネットワーク状態をリセット
    globalNetworkStatus.isOnline = true;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: true }),
    );
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    window.dispatchEvent = originalDispatchEvent;
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("オンライン時に活動記録を削除できる", async () => {
    vi.mocked(
      apiClient.users["activity-logs"][":id"].$delete,
    ).mockResolvedValue(
      Response.json({ message: "Deleted" }, { status: 200 }) as any,
    );

    const { result } = renderHookWithAct(() => useDeleteActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "log-123",
        date: "2024-01-15",
      });
    });

    expect(
      apiClient.users["activity-logs"][":id"].$delete,
    ).toHaveBeenCalledWith({
      param: { id: "log-123" },
    });
  });

  it("楽観的更新で削除が反映される", async () => {
    const dateKey = ["activity-logs-daily", "2024-01-15"];
    const existingLogs = [
      { id: "log-123", date: "2024-01-15", quantity: 30 },
      { id: "log-456", date: "2024-01-15", quantity: 45 },
    ];

    queryClient.setQueryData(dateKey, existingLogs);

    const { result } = renderHookWithAct(() => useDeleteActivityLog(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: "log-123",
        date: "2024-01-15",
      });
    });

    // 楽観的更新の確認
    const updatedData = queryClient.getQueryData(dateKey) as any[];
    expect(updatedData).toHaveLength(1);
    expect(updatedData[0].id).toBe("log-456");
  });

  it("オフライン時に削除IDが記録される", async () => {
    globalNetworkStatus.isOnline = false;
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );

    const storageKey = "offline-activity-logs-2024-01-15";
    const deletedKey = "deleted-activity-logs-2024-01-15";

    // 既存のオフラインデータをセット
    localStorage.setItem(
      storageKey,
      JSON.stringify([{ id: "log-123", date: "2024-01-15", quantity: 30 }]),
    );

    const { result } = renderHookWithAct(() => useDeleteActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "log-123",
        date: "2024-01-15",
      });
    });

    // オフラインデータから削除されていることを確認
    const remainingLogs = JSON.parse(localStorage.getItem(storageKey) || "[]");
    expect(remainingLogs).toHaveLength(0);

    // 削除IDが記録されていることを確認
    const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
    expect(deletedIds).toContain("log-123");

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      new Event("offline-data-updated"),
    );
  });

  it("エラー時に楽観的更新がロールバックされる", async () => {
    const dateKey = ["activity-logs-daily", "2024-01-15"];
    const originalLogs = [
      { id: "log-123", date: "2024-01-15", quantity: 30 },
      { id: "log-456", date: "2024-01-15", quantity: 45 },
    ];

    queryClient.setQueryData(dateKey, [...originalLogs]);

    vi.mocked(
      apiClient.users["activity-logs"][":id"].$delete,
    ).mockRejectedValue(new Error("削除エラー"));

    const { result } = renderHookWithAct(() => useDeleteActivityLog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: "log-123",
          date: "2024-01-15",
        });
      } catch (error) {
        // エラーを無視
      }
    });

    // ロールバック後のデータ確認
    const rollbackedData = queryClient.getQueryData(dateKey) as any[];
    expect(rollbackedData).toHaveLength(2);
    expect(rollbackedData[0].id).toBe("log-123");
  });
});
