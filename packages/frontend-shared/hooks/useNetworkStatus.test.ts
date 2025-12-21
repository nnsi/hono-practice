import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NetworkAdapter, StorageAdapter } from "../adapters";
import {
  createUseNetworkStatus,
  getSimulatedOffline,
  setSimulatedOffline,
} from "./useNetworkStatus";

// モックAdapters作成
const createMockNetworkAdapter = (
  initialOnline = true,
): NetworkAdapter & { triggerChange: (online: boolean) => void } => {
  let isOnline = initialOnline;
  const listeners: Array<(online: boolean) => void> = [];

  return {
    isOnline: vi.fn(() => isOnline),
    addListener: vi.fn((callback: (online: boolean) => void) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    }),
    triggerChange: (online: boolean) => {
      isOnline = online;
      listeners.forEach((listener) => listener(online));
    },
  };
};

const createMockStorageAdapter = (): StorageAdapter => {
  const storage = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) || null)),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Array.from(storage.keys()))),
  };
};

describe("createUseNetworkStatus", () => {
  let network: ReturnType<typeof createMockNetworkAdapter>;
  let storage: StorageAdapter;

  beforeEach(() => {
    network = createMockNetworkAdapter(true);
    storage = createMockStorageAdapter();
    // Reset simulated offline state
    act(() => {
      setSimulatedOffline(false);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    act(() => {
      setSimulatedOffline(false);
    });
  });

  it("初期状態でオンラインの場合", () => {
    const { result } = renderHook(() =>
      createUseNetworkStatus({
        network,
        storage,
      }),
    );

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnlineAt).toBe(null);
    expect(result.current.lastOfflineAt).toBe(null);
    expect(result.current.isSimulated).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith("network-status", "online");
  });

  it("初期状態でオフラインの場合", () => {
    network = createMockNetworkAdapter(false);
    const { result } = renderHook(() =>
      createUseNetworkStatus({
        network,
        storage,
      }),
    );

    expect(result.current.isOnline).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith("network-status", "offline");
  });

  it("ネットワーク状態の変更を検知できること", () => {
    const { result } = renderHook(() =>
      createUseNetworkStatus({
        network,
      }),
    );

    expect(result.current.isOnline).toBe(true);

    act(() => {
      network.triggerChange(false);
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastOfflineAt).toBeInstanceOf(Date);

    act(() => {
      network.triggerChange(true);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
  });

  it("ストレージに状態が保存されること", () => {
    renderHook(() =>
      createUseNetworkStatus({
        network,
        storage,
      }),
    );

    act(() => {
      network.triggerChange(false);
    });

    expect(storage.setItem).toHaveBeenCalledWith("network-status", "offline");

    act(() => {
      network.triggerChange(true);
    });

    expect(storage.setItem).toHaveBeenCalledWith("network-status", "online");
  });

  it("リスナーの登録と削除が正しく動作すること", () => {
    const { unmount } = renderHook(() =>
      createUseNetworkStatus({
        network,
      }),
    );

    expect(network.addListener).toHaveBeenCalledTimes(1);

    unmount();

    // リスナーが削除されていることを確認
    // ネットワーク状態を変更してもエラーが発生しないことを確認
    act(() => {
      network.triggerChange(false);
    });
  });

  describe("開発環境でのオフラインシミュレーション", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("シミュレートされたオフライン状態を反映すること", () => {
      // グローバルシミュレーション状態をtrueに設定
      act(() => {
        setSimulatedOffline(true);
      });

      const { result } = renderHook(() =>
        createUseNetworkStatus({
          network,
        }),
      );

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSimulated).toBe(true);
    });

    it("グローバルなシミュレート状態を反映すること", () => {
      act(() => {
        setSimulatedOffline(true);
      });

      const { result } = renderHook(() =>
        createUseNetworkStatus({
          network,
        }),
      );

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSimulated).toBe(true);
    });

    it("シミュレート状態の変更を検知すること", async () => {
      const { result } = renderHook(() =>
        createUseNetworkStatus({
          network,
        }),
      );

      expect(result.current.isOnline).toBe(true);

      await act(async () => {
        setSimulatedOffline(true);
        // 状態の更新を待つ
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSimulated).toBe(true);

      await act(async () => {
        setSimulatedOffline(false);
        // 状態の更新を待つ
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSimulated).toBe(false);
    });
  });

  it("getSimulatedOffline関数が正しく動作すること", () => {
    expect(getSimulatedOffline()).toBe(false);

    setSimulatedOffline(true);
    expect(getSimulatedOffline()).toBe(true);

    setSimulatedOffline(false);
    expect(getSimulatedOffline()).toBe(false);
  });
});
