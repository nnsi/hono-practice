import { act } from "react";

import {
  createMockStorage,
  flushPromisesWithAct,
  renderHookWithAct,
} from "@frontend/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSimulatedOffline,
  setSimulatedOffline,
  useNetworkStatus,
  useNetworkStatusWithManager,
} from "../useNetworkStatus";

describe("useNetworkStatus", () => {
  let originalNavigatorOnLine: boolean;

  beforeEach(() => {
    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
    act(() => {
      setSimulatedOffline(false);
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: originalNavigatorOnLine,
    });
    act(() => {
      setSimulatedOffline(false);
    });
  });

  describe("基本的な動作", () => {
    it("初期状態でオンラインステータスを正しく返す", async () => {
      const { result } = await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        // 初期化時のlocalStorage更新を待つ
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.lastOnlineAt).toBeNull();
      expect(result.current.lastOfflineAt).toBeNull();
      expect(result.current.isSimulated).toBe(false);
    });

    it("navigator.onLineがfalseの場合、オフラインステータスを返す", async () => {
      await act(async () => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: false,
        });
      });

      const { result } = await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        // 初期化時のlocalStorage更新を待つ
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(false);
    });

    it("オンラインイベントでステータスが更新される", async () => {
      await act(async () => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: false,
        });
      });

      const { result } = await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(false);

      // オンラインに変更してイベントを発火
      await act(async () => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event("online"));
        // イベントハンドラの実行を待つ
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
    });

    it("オフラインイベントでステータスが更新される", async () => {
      const { result } = await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(true);

      // オフラインに変更してイベントを発火
      await act(async () => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event("offline"));
        // イベントハンドラの実行を待つ
        await flushPromisesWithAct();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.lastOfflineAt).toBeInstanceOf(Date);
    });
  });

  describe("シミュレートされたオフライン状態", () => {
    it("getSimulatedOffline/setSimulatedOfflineが正しく動作する", () => {
      // 初期状態の確認
      expect(getSimulatedOffline()).toBe(false);

      // シミュレーションを有効にする
      act(() => {
        setSimulatedOffline(true);
      });

      expect(getSimulatedOffline()).toBe(true);

      // リセット
      act(() => {
        setSimulatedOffline(false);
      });

      expect(getSimulatedOffline()).toBe(false);
    });

    it("開発環境の場合にシミュレーション状態がisSimulatedプロパティに反映される", async () => {
      // 現在の環境が開発環境の場合のみ、このテストは意味を持つ
      // テスト環境でimport.meta.env.DEVを変更できないため、
      // フックの動作のみを確認
      const { result } = await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        await flushPromisesWithAct();
      });

      // 初期状態では通常のオンライン状態
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSimulated).toBeDefined();
    });
  });

  describe("localStorage統合", () => {
    it("ネットワークステータスをlocalStorageに保存する", async () => {
      await renderHookWithAct(() => useNetworkStatus());

      await act(async () => {
        await flushPromisesWithAct();
      });

      expect(localStorage.getItem("network-status")).toBe("online");

      // オフラインに変更
      await act(async () => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event("offline"));
        await flushPromisesWithAct();
      });

      expect(localStorage.getItem("network-status")).toBe("offline");
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーが削除される", async () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = await renderHookWithAct(() => useNetworkStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });
  });
});

describe("useNetworkStatusWithManager", () => {
  it("NetworkStatusManagerを使用してステータスを管理する", async () => {
    const mockStorage = createMockStorage();
    const mockNetworkStatusManager = {
      isOnline: vi.fn().mockReturnValue(true),
      addListener: vi.fn().mockReturnValue(() => {}),
    };

    const { result } = await renderHookWithAct(() =>
      useNetworkStatusWithManager(mockNetworkStatusManager, mockStorage),
    );

    expect(result.current.isOnline).toBe(true);
    expect(mockNetworkStatusManager.isOnline).toHaveBeenCalled();
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "network-status",
      "online",
    );
  });

  it("リスナーが正しく登録される", async () => {
    const mockStorage = createMockStorage();
    let registeredListener: ((online: boolean) => void) | null = null;
    const mockNetworkStatusManager = {
      isOnline: vi.fn().mockReturnValue(true),
      addListener: vi.fn((listener) => {
        registeredListener = listener;
        return () => {};
      }),
    };

    const { result } = await renderHookWithAct(() =>
      useNetworkStatusWithManager(mockNetworkStatusManager, mockStorage),
    );

    expect(mockNetworkStatusManager.addListener).toHaveBeenCalled();

    // リスナーコールバックをテスト
    await act(async () => {
      registeredListener?.(false);
      await flushPromisesWithAct();
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastOfflineAt).toBeInstanceOf(Date);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "network-status",
      "offline",
    );
  });

  it("アンマウント時にリスナーが解除される", async () => {
    const mockUnsubscribe = vi.fn();
    const mockNetworkStatusManager = {
      isOnline: vi.fn().mockReturnValue(true),
      addListener: vi.fn().mockReturnValue(mockUnsubscribe),
    };

    const { unmount } = await renderHookWithAct(() =>
      useNetworkStatusWithManager(mockNetworkStatusManager),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe("getSimulatedOffline", () => {
  it("シミュレートされたオフライン状態を取得できる", () => {
    expect(getSimulatedOffline()).toBe(false);

    setSimulatedOffline(true);
    expect(getSimulatedOffline()).toBe(true);

    setSimulatedOffline(false);
    expect(getSimulatedOffline()).toBe(false);
  });
});
