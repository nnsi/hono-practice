import type { ReactNode } from "react";

import { AuthContext } from "@frontend/providers/AuthProvider";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { getSyncManagerInstance } from "@frontend/services/sync";
import {
  createMockAuthContext,
  createMockNetworkStatus,
  createMockSyncManager,
  createMockUserResponse,
} from "@frontend/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSyncedMutation } from "../useSyncedMutation";

import type { SyncManager } from "@frontend/services/sync";

// モック
vi.mock("@frontend/services/sync", () => ({
  getSyncManagerInstance: vi.fn(),
}));

vi.mock("@frontend/providers/NetworkStatusProvider", () => ({
  NetworkStatusProvider: ({ children }: { children: ReactNode }) => children,
  useNetworkStatusContext: vi.fn(),
}));

describe("useSyncedMutation", () => {
  let mockSyncManager: SyncManager;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSyncManager = createMockSyncManager();
    vi.mocked(getSyncManagerInstance).mockReturnValue(mockSyncManager);
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

  const createWrapper = (user: any = createMockUserResponse()) => {
    // null/undefinedが明示的に渡された場合はnullを維持
    const mockAuthContext = createMockAuthContext({ user: user });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  it("オンライン時にonlineActionを実行する", async () => {
    const mockOnlineAction = vi
      .fn()
      .mockResolvedValue({ id: "123", success: true });

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: mockOnlineAction,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Test Activity" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOnlineAction).toHaveBeenCalledWith({ name: "Test Activity" });
    expect(result.current.data).toEqual({ id: "123", success: true });
  });

  it("オフライン時にofflineActionを実行する", async () => {
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );

    const mockOfflineAction = vi
      .fn()
      .mockReturnValue({ id: "temp-123", success: true });

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: vi.fn(),
          offlineAction: mockOfflineAction,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Test Activity" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOfflineAction).toHaveBeenCalledWith({ name: "Test Activity" });
    // オフラインキューへの登録は無効化されているため、enqueueは呼ばれない
    expect(mockSyncManager.enqueue).not.toHaveBeenCalled();
  });

  it("オフライン時にofflineActionが定義されていない場合エラーをスローする", async () => {
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Test Activity" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(
      new Error("オフライン時の処理が定義されていません"),
    );
  });

  it("オンライン時にonlineActionが失敗した場合、offlineActionにフォールバックする", async () => {
    const mockOnlineAction = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
    const mockOfflineAction = vi
      .fn()
      .mockReturnValue({ id: "temp-123", success: true });

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: mockOnlineAction,
          offlineAction: mockOfflineAction,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Test Activity" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOnlineAction).toHaveBeenCalled();
    expect(mockOfflineAction).toHaveBeenCalled();
    // オフラインキューへの登録は無効化されているため、enqueueは呼ばれない
    expect(mockSyncManager.enqueue).not.toHaveBeenCalled();
  });

  it("optimisticUpdateが定義されている場合、mutate時に実行される", async () => {
    const mockOptimisticUpdate = vi.fn();
    const mockOnlineAction = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "update",
          onlineAction: mockOnlineAction,
          optimisticUpdate: mockOptimisticUpdate,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Updated Activity" });
    });

    expect(mockOptimisticUpdate).toHaveBeenCalledWith({
      name: "Updated Activity",
    });
  });

  it("onSuccess、onErrorコールバックが正しく実行される", async () => {
    const mockOnSuccess = vi.fn();
    const mockOnError = vi.fn();
    const mockOnlineAction = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: mockOnlineAction,
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ name: "Test Activity" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(
      { success: true },
      { name: "Test Activity" },
      undefined,
    );
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it("syncStatusが含まれた結果を返す", () => {
    const mockSyncStatus = {
      pendingCount: 5,
      syncingCount: 2,
      failedCount: 1,
      totalCount: 8,
      syncPercentage: 75,
      lastSyncedAt: new Date(),
    };

    vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue(mockSyncStatus);

    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.syncStatus).toEqual(mockSyncStatus);
  });

  it("オンラインに復帰した時でも自動同期は実行されない", async () => {
    vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue({
      pendingCount: 3,
      syncingCount: 0,
      failedCount: 0,
      totalCount: 3,
      syncPercentage: 0,
      lastSyncedAt: null,
    });

    const { rerender } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    // オフラインからオンラインに変更
    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: false }),
    );
    rerender();

    vi.mocked(useNetworkStatusContext).mockReturnValue(
      createMockNetworkStatus({ isOnline: true }),
    );
    rerender();

    // 自動同期は無効化されているため、syncBatchは呼ばれない
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockSyncManager.syncBatch).not.toHaveBeenCalled();
  });

  it("ユーザーがない場合でも動作する", () => {
    const { result } = renderHook(
      () =>
        useSyncedMutation({
          entityType: "activity",
          getEntityId: () => "activity-123",
          operation: "create",
          onlineAction: vi.fn(),
        }),
      { wrapper: createWrapper(null) },
    );

    expect(getSyncManagerInstance).toHaveBeenCalledWith(undefined);
    expect(result.current).toBeDefined();
  });
});
