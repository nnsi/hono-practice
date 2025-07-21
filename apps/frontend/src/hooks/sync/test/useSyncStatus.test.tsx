import { AuthContext } from "@frontend/providers/AuthProvider";
import { getSyncManagerInstance } from "@frontend/services/sync";
import {
  createMockAuthContext,
  createMockSyncManager,
  createMockSyncStatus,
  createMockUserResponse,
} from "@frontend/test-utils";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSyncStatus } from "../useSyncStatus";

import type { SyncManager } from "@frontend/services/sync";

// getSyncManagerInstanceのモック
vi.mock("@frontend/services/sync", () => ({
  getSyncManagerInstance: vi.fn(),
}));

describe("useSyncStatus", () => {
  let mockSyncManager: SyncManager;
  let mockUnsubscribe: () => void;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    mockSyncManager = createMockSyncManager({
      subscribeToStatus: vi.fn().mockReturnValue(mockUnsubscribe),
    });

    vi.mocked(getSyncManagerInstance).mockReturnValue(mockSyncManager);
  });

  it("初期状態で同期ステータスを取得する", () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    expect(mockSyncManager.getSyncStatus).toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.syncingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.syncPercentage).toBe(100);
  });

  it("ユーザーIDでSyncManagerを更新する", () => {
    const mockUser = createMockUserResponse({ id: "user-123" });
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    renderHook(() => useSyncStatus(), { wrapper });

    expect(getSyncManagerInstance).toHaveBeenCalledWith("user-123");
    expect(mockSyncManager.updateUserId).toHaveBeenCalledWith("user-123");
  });

  it("ステータス変更を購読する", () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    expect(mockSyncManager.subscribeToStatus).toHaveBeenCalled();

    // ステータス更新をシミュレート
    const subscribedCallback = vi.mocked(mockSyncManager.subscribeToStatus).mock
      .calls[0][0];
    const newStatus = createMockSyncStatus({ pendingCount: 5 });

    act(() => {
      subscribedCallback(newStatus);
    });

    expect(result.current.pendingCount).toBe(5);
  });

  it("計算されたプロパティが正しく動作する", () => {
    const mockStatus = createMockSyncStatus({
      pendingCount: 3,
      syncingCount: 2,
      failedCount: 1,
    });

    vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue(mockStatus);

    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    expect(result.current.hasPendingSync).toBe(true);
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.isFullySynced).toBe(false);
  });

  it("isFullySyncedがpendingとfailedが0の時にtrueになる", () => {
    const mockStatus = createMockSyncStatus({
      pendingCount: 0,
      syncingCount: 2,
      failedCount: 0,
    });

    vi.mocked(mockSyncManager.getSyncStatus).mockReturnValue(mockStatus);

    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    expect(result.current.isFullySynced).toBe(true);
  });

  it("syncNow関数が正しく動作する", async () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await act(async () => {
      await result.current.syncNow();
    });

    expect(mockSyncManager.syncBatch).toHaveBeenCalled();
  });

  it("syncAll関数が正しく動作する", async () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await act(async () => {
      await result.current.syncAll();
    });

    expect(mockSyncManager.syncAll).toHaveBeenCalled();
  });

  it("clearQueue関数が正しく動作する", async () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    await act(async () => {
      await result.current.clearQueue();
    });

    expect(mockSyncManager.clearQueue).toHaveBeenCalled();
  });

  it("ユーザーがない場合でも動作する", () => {
    const mockAuthContext = createMockAuthContext({ user: null });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useSyncStatus(), { wrapper });

    expect(getSyncManagerInstance).toHaveBeenCalledWith(undefined);
    expect(mockSyncManager.updateUserId).toHaveBeenCalledWith(undefined);
    expect(result.current).toBeDefined();
  });

  it("アンマウント時に購読が解除される", () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { unmount } = renderHook(() => useSyncStatus(), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
