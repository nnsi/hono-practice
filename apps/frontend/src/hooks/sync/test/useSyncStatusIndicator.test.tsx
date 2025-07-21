import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSyncStatusIndicator } from "../useSyncStatusIndicator";

// モック関数をvi.hoistedで定義
const { mockToast, mockUseNetworkStatusContext, mockUseSyncStatus } =
  vi.hoisted(() => {
    return {
      mockToast: vi.fn(),
      mockUseNetworkStatusContext: vi.fn(),
      mockUseSyncStatus: vi.fn(),
    };
  });

// toast のモック
vi.mock("@frontend/components/ui/use-toast", () => ({
  toast: mockToast,
}));

// useNetworkStatusContext のモック
vi.mock("@frontend/providers/NetworkStatusProvider", () => ({
  useNetworkStatusContext: mockUseNetworkStatusContext,
}));

// useSyncStatus のモック
vi.mock("@frontend/hooks/sync/useSyncStatus", () => ({
  useSyncStatus: mockUseSyncStatus,
}));

describe("useSyncStatusIndicator", () => {
  const defaultSyncStatus = {
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    hasPendingSync: false,
    isSyncing: false,
    syncNow: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllTimers();
    mockToast.mockClear();
    mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
    mockUseSyncStatus.mockReturnValue(defaultSyncStatus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("デフォルトの状態を正しく返す", () => {
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.hasPendingSync).toBe(false);
      expect(result.current.totalUnsyncedCount).toBe(0);
    });
  });

  describe("同期エラー通知", () => {
    it("エラー数が増えた場合にトースト通知を表示する", () => {
      const { rerender } = renderHook(() => useSyncStatusIndicator());

      // エラー数を増やす
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 3,
      });
      rerender();

      expect(mockToast).toHaveBeenCalledWith({
        title: "同期エラー",
        description:
          "3件のデータの同期に失敗しました。オンライン状態を確認してください。",
        variant: "destructive",
      });
    });

    it("エラー数が変わらない場合は通知しない", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 3,
      });
      const { rerender } = renderHook(() => useSyncStatusIndicator());

      mockToast.mockClear();

      // エラー数が変わらない
      rerender();

      expect(mockToast).not.toHaveBeenCalled();
    });

    it("エラー数が減った場合は通知しない", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 3,
      });
      const { rerender } = renderHook(() => useSyncStatusIndicator());

      mockToast.mockClear();

      // エラー数を減らす
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 1,
      });
      rerender();

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("オンライン復帰通知", () => {
    it("オフラインからオンラインに復帰し、未同期データがある場合に通知する", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        hasPendingSync: true,
        pendingCount: 5,
      });

      const { rerender } = renderHook(() => useSyncStatusIndicator());

      mockToast.mockClear();

      // オンラインに復帰
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      rerender();

      expect(mockToast).toHaveBeenCalledWith({
        title: "オンラインに復帰",
        description: "未同期のデータがあります。同期を開始します。",
      });
    });

    it("オンライン復帰時に未同期データがない場合は通知しない", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { rerender } = renderHook(() => useSyncStatusIndicator());

      mockToast.mockClear();

      // オンラインに復帰（未同期データなし）
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      rerender();

      expect(mockToast).not.toHaveBeenCalled();
    });

    it("すでにオンラインの場合は通知しない", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        hasPendingSync: true,
      });

      const { rerender } = renderHook(() => useSyncStatusIndicator());

      mockToast.mockClear();

      // すでにオンラインなので通知されない
      rerender();

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("手動同期", () => {
    it("オンライン時に同期を実行できる", async () => {
      const mockSyncNow = vi.fn().mockResolvedValue(undefined);
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        syncNow: mockSyncNow,
      });

      const { result } = renderHook(() => useSyncStatusIndicator());

      await act(async () => {
        await result.current.handleSync();
      });

      expect(mockSyncNow).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "同期完了",
        description: "すべてのデータが同期されました。",
      });
    });

    it("オフライン時は同期を実行しない", async () => {
      const mockSyncNow = vi.fn();
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        syncNow: mockSyncNow,
      });

      const { result } = renderHook(() => useSyncStatusIndicator());

      await act(async () => {
        await result.current.handleSync();
      });

      expect(mockSyncNow).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("同期中は再度同期を実行しない", async () => {
      const mockSyncNow = vi.fn();
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isSyncing: true,
        syncingCount: 1,
        syncNow: mockSyncNow,
      });

      const { result } = renderHook(() => useSyncStatusIndicator());

      await act(async () => {
        await result.current.handleSync();
      });

      expect(mockSyncNow).not.toHaveBeenCalled();
    });

    it("同期エラー時にエラー通知を表示する", async () => {
      const mockSyncNow = vi.fn().mockRejectedValue(new Error("Sync failed"));
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        syncNow: mockSyncNow,
      });

      const { result } = renderHook(() => useSyncStatusIndicator());

      await act(async () => {
        await result.current.handleSync();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "同期エラー",
        description:
          "データの同期に失敗しました。しばらくしてから再試行してください。",
        variant: "destructive",
      });
    });

    it("未同期またはエラーがある場合は完了通知を表示しない", async () => {
      const mockSyncNow = vi.fn().mockResolvedValue(undefined);
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 2,
        failedCount: 1,
        syncNow: mockSyncNow,
      });

      const { result } = renderHook(() => useSyncStatusIndicator());

      await act(async () => {
        await result.current.handleSync();
      });

      expect(mockSyncNow).toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: "同期完了" }),
      );
    });
  });

  describe("ステータスアイコン", () => {
    it("オフライン時のアイコンを返す", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result } = renderHook(() => useSyncStatusIndicator());

      const icon = result.current.getStatusIcon();
      expect(icon.name).toBe("CloudOff");
      expect(icon.className).toContain("text-gray-400");
    });

    it("同期中のアイコンを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isSyncing: true,
        syncingCount: 1,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      const icon = result.current.getStatusIcon();
      expect(icon.name).toBe("RefreshCw");
      expect(icon.className).toContain("text-blue-500");
      expect(icon.className).toContain("animate-spin");
    });

    it("エラーありのアイコンを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 1,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      const icon = result.current.getStatusIcon();
      expect(icon.name).toBe("Cloud");
      expect(icon.className).toContain("text-red-500");
    });

    it("未同期ありのアイコンを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        hasPendingSync: true,
        pendingCount: 3,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      const icon = result.current.getStatusIcon();
      expect(icon.name).toBe("Cloud");
      expect(icon.className).toContain("text-yellow-500");
    });

    it("同期済みのアイコンを返す", () => {
      const { result } = renderHook(() => useSyncStatusIndicator());

      const icon = result.current.getStatusIcon();
      expect(icon.name).toBe("Cloud");
      expect(icon.className).toContain("text-green-500");
    });
  });

  describe("ステータステキスト", () => {
    it("オフライン時のテキストを返す", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.getStatusText()).toBe("オフライン");
    });

    it("同期中のテキストを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isSyncing: true,
        syncingCount: 1,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.getStatusText()).toBe("同期中...");
    });

    it("エラーありのテキストを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        failedCount: 3,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.getStatusText()).toBe("同期エラー (3件)");
    });

    it("未同期ありのテキストを返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        hasPendingSync: true,
        pendingCount: 5,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.getStatusText()).toBe("未同期 (5件)");
    });

    it("同期済みのテキストを返す", () => {
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.getStatusText()).toBe("同期済み");
    });
  });

  describe("未同期数のカウント", () => {
    it("全ての未同期数を合計して返す", () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 3,
        syncingCount: 2,
        failedCount: 1,
      });
      const { result } = renderHook(() => useSyncStatusIndicator());

      expect(result.current.totalUnsyncedCount).toBe(6);
    });
  });
});
