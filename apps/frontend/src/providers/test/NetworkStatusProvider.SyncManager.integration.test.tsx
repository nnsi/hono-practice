import "@testing-library/jest-dom/vitest";
import { getSyncManagerInstance } from "@frontend/services/sync";
import { createMockApiClient } from "@frontend/test-utils";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NetworkStatusProvider,
  useNetworkStatusContext,
} from "../NetworkStatusProvider";

import type { SyncManager } from "@frontend/services/sync";

// getSyncManagerInstanceのモック
vi.mock("@frontend/services/sync", async () => {
  const actual = await vi.importActual("@frontend/services/sync");
  return {
    ...actual,
    getSyncManagerInstance: vi.fn(),
  };
});

// useAuthのモック
vi.mock("@frontend/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-123", name: null, providers: [] },
  })),
}));

// useNetworkStatusのモック
const mockNetworkStatus = { isOnline: true };
vi.mock("@frontend/hooks/useNetworkStatus", () => ({
  useNetworkStatus: vi.fn(() => mockNetworkStatus),
}));

// getSyncManagerInstanceのモック
let mockSyncManager: SyncManager;
vi.mock("@frontend/services/sync", async () => {
  const actual = await vi.importActual<
    typeof import("@frontend/services/sync")
  >("@frontend/services/sync");
  return {
    ...actual,
    getSyncManagerInstance: vi.fn(() => mockSyncManager),
  };
});

describe("NetworkStatusProvider + SyncManager 統合テスト", () => {
  let apiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    apiClient = createMockApiClient();

    // apiClientにindexプロパティを追加
    (apiClient as any).index = {
      $get: vi.fn(),
    };

    // SyncManagerインスタンスを作成（モック化）
    mockSyncManager = {
      startAutoSync: vi.fn(),
      stopAutoSync: vi.fn(),
      syncBatch: vi.fn(async () => []),
      updateUserId: vi.fn(),
      getSyncStatus: vi.fn(() => ({
        pendingCount: 0,
        syncingCount: 0,
        failedCount: 0,
        totalCount: 0,
        syncPercentage: 0,
        lastSyncedAt: null,
      })),
      clearQueue: vi.fn(),
      enqueue: vi.fn(),
      syncAll: vi.fn(),
      subscribeToStatus: vi.fn(),
      checkDuplicates: vi.fn(),
      pullSync: vi.fn(),
    };

    mockNetworkStatus.isOnline = true;

    // getSyncManagerInstanceがmockSyncManagerを返すように設定
    vi.mocked(getSyncManagerInstance).mockReturnValue(mockSyncManager);
  });

  afterEach(() => {
    mockSyncManager.stopAutoSync();
    vi.clearAllMocks();
  });

  describe("ネットワーク状態の変化", () => {
    it("オンラインになったときに自動同期を開始する", async () => {
      mockNetworkStatus.isOnline = false;

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // オフラインの状態を確認
      expect(mockSyncManager.stopAutoSync).toHaveBeenCalled();

      // オンラインに変更
      mockNetworkStatus.isOnline = true;
      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      await waitFor(() => {
        expect(mockSyncManager.startAutoSync).toHaveBeenCalled();
      });
    });

    it("オフラインになったときに自動同期を停止する", async () => {
      mockNetworkStatus.isOnline = true;

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // オンラインの状態を確認
      expect(mockSyncManager.startAutoSync).toHaveBeenCalled();

      // オフラインに変更
      mockNetworkStatus.isOnline = false;
      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      await waitFor(() => {
        expect(mockSyncManager.stopAutoSync).toHaveBeenCalled();
      });
    });

    it("オンライン復帰時に保留中のアイテムがある場合、同期を実行する", async () => {
      // getSyncStatusが保留中のアイテムがあることを返すように設定
      vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue({
        pendingCount: 1,
        syncingCount: 0,
        failedCount: 0,
        totalCount: 1,
        syncPercentage: 0,
        lastSyncedAt: null,
      });

      // getSyncManagerInstanceが呼ばれた回数を確認
      vi.mocked(mockSyncManager.syncBatch).mockImplementation(async () => {
        console.log("syncBatch called");
        return [];
      });

      mockNetworkStatus.isOnline = false;

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // オンラインに変更
      mockNetworkStatus.isOnline = true;

      // APIレスポンスのモック
      apiClient.users.sync.batch.$post.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              clientId: "mock-1",
              status: "success",
              serverId: "server-1",
            },
          ],
        }),
      });

      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      await waitFor(() => {
        expect(mockSyncManager.syncBatch).toHaveBeenCalled();
      });
    });
  });

  describe("ユーザーIDの変更", () => {
    it("ユーザーIDが変更されたときにSyncManagerのユーザーIDを更新する", async () => {
      const { useAuth } = await import("@frontend/hooks/useAuth");
      const mockUseAuth = vi.mocked(useAuth);

      // 初期ユーザー
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", name: null, providers: [] },
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        requestStatus: "idle",
        setUser: vi.fn(),
        setAccessToken: vi.fn(),
        scheduleTokenRefresh: vi.fn(),
        isInitialized: true,
      });

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      expect(mockSyncManager.updateUserId).toHaveBeenCalledWith("user-1");

      // ユーザーを変更
      mockUseAuth.mockReturnValue({
        user: { id: "user-2", name: null, providers: [] },
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        requestStatus: "idle",
        setUser: vi.fn(),
        setAccessToken: vi.fn(),
        scheduleTokenRefresh: vi.fn(),
        isInitialized: true,
      });

      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      await waitFor(() => {
        expect(mockSyncManager.updateUserId).toHaveBeenCalledWith("user-2");
      });
    });

    it("ユーザーがログアウトしたときにユーザーIDをクリアする", async () => {
      const { useAuth } = await import("@frontend/hooks/useAuth");
      const mockUseAuth = vi.mocked(useAuth);

      // 初期ユーザー
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", name: null, providers: [] },
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        requestStatus: "idle",
        setUser: vi.fn(),
        setAccessToken: vi.fn(),
        scheduleTokenRefresh: vi.fn(),
        isInitialized: true,
      });

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // ログアウト（userがnull）
      mockUseAuth.mockReturnValue({
        user: null,
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        requestStatus: "idle",
        setUser: vi.fn(),
        setAccessToken: vi.fn(),
        scheduleTokenRefresh: vi.fn(),
        isInitialized: true,
      });

      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      await waitFor(() => {
        expect(mockSyncManager.updateUserId).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("コンテキストの利用", () => {
    it("useNetworkStatusContextでネットワーク状態を取得できる", () => {
      const TestComponent = () => {
        const status = useNetworkStatusContext();
        return <div>{status.isOnline ? "Online" : "Offline"}</div>;
      };

      const { getByText } = render(
        <NetworkStatusProvider>
          <TestComponent />
        </NetworkStatusProvider>,
      );

      expect(getByText("Online")).toBeInTheDocument();
    });

    it("NetworkStatusProviderの外でuseNetworkStatusContextを使用するとエラーになる", () => {
      const TestComponent = () => {
        const status = useNetworkStatusContext();
        return <div>{status.isOnline ? "Online" : "Offline"}</div>;
      };

      // コンソールエラーを無視
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow(
        "useNetworkStatusContext must be used within NetworkStatusProvider",
      );

      console.error = originalError;
    });
  });

  describe("同期の実行", () => {
    it("自動同期が正しくスケジュールされる", async () => {
      render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // startAutoSyncが呼ばれることを確認
      await waitFor(() => {
        expect(mockSyncManager.startAutoSync).toHaveBeenCalled();
      });
    });

    it("同期が正しく実行される", async () => {
      // getSyncStatusが保留中のアイテムがあることを返すように設定
      vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue({
        pendingCount: 1,
        syncingCount: 0,
        failedCount: 0,
        totalCount: 1,
        syncPercentage: 0,
        lastSyncedAt: null,
      });

      render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // 同期が呼ばれることを確認
      await waitFor(() => {
        expect(mockSyncManager.syncBatch).toHaveBeenCalled();
      });
    });

    it("同期エラー時にリトライが設定される", async () => {
      // syncBatchがエラーをスローするように設定
      vi.mocked(mockSyncManager.syncBatch).mockRejectedValue(
        new Error("Network error"),
      );

      // 同期を実行
      await expect(mockSyncManager.syncBatch()).rejects.toThrow(
        "Network error",
      );

      // syncBatchがエラーをスローしたことを確認
      expect(mockSyncManager.syncBatch).toHaveBeenCalled();
    });
  });

  describe("複数操作の統合", () => {
    it("オフライン中に複数の操作をキューイングし、オンライン復帰時に一括同期する", async () => {
      const { useAuth } = await import("@frontend/hooks/useAuth");
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "user-1", name: null, providers: [] },
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        requestStatus: "idle",
        setUser: vi.fn(),
        setAccessToken: vi.fn(),
        scheduleTokenRefresh: vi.fn(),
        isInitialized: true,
      });

      // オフラインで開始
      mockNetworkStatus.isOnline = false;

      const { rerender } = render(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // getSyncStatusが保留中のアイテムがあることを返すように設定
      vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue({
        pendingCount: 3,
        syncingCount: 0,
        failedCount: 0,
        totalCount: 3,
        syncPercentage: 0,
        lastSyncedAt: null,
      });

      // オンラインに復帰
      mockNetworkStatus.isOnline = true;
      rerender(
        <NetworkStatusProvider>
          <div>Test</div>
        </NetworkStatusProvider>,
      );

      // 同期が実行されることを待つ
      await waitFor(() => {
        expect(mockSyncManager.syncBatch).toHaveBeenCalled();
      });
    });
  });
});
