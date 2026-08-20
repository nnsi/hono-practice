import { useEffect, useSyncExternalStore } from "react";

import {
  DEFAULT_TAB_KEYS,
  type TabKey,
  createDefaultTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTabPreferenceStore } from "./createTabPreferenceStore";
import type {
  TabPreferenceFlushTransport,
  TabPreferenceStorage,
} from "./createTabPreferenceStore.types";

const SETTINGS_KEY = "actiko-v2-settings";

/** AsyncStorage を模した非同期 in-memory storage。 */
function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage: TabPreferenceStorage & {
    raw: () => Map<string, string>;
  } = {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    raw: () => map,
  };
  return storage;
}

/**
 * 実 API と同様に、送信された tabs / updatedAt をそのまま echo する transport。
 * （server が pending と同じ version を返すと synced に解決される）
 */
function echoTransport(): TabPreferenceFlushTransport {
  return {
    putTabPreference: vi.fn(async (input) => ({
      ok: true,
      status: 200,
      json: async () => ({ tabs: input.tabs, updatedAt: input.updatedAt }),
    })),
  };
}

function statusTransport(status: number): TabPreferenceFlushTransport {
  return {
    putTabPreference: vi.fn(async () => ({
      ok: false,
      status,
      json: async () => ({}),
    })),
  };
}

function baseDeps(over: {
  storage: TabPreferenceStorage;
  transport: TabPreferenceFlushTransport;
  initialLoad: "sync" | "lazy";
  readSyncInitial?: () => ReturnType<typeof createDefaultTabPreference> & {
    syncStatus: "synced" | "pending";
  };
}) {
  return {
    react: { useEffect },
    useSyncExternalStore,
    storage: over.storage,
    transport: over.transport,
    settingsKey: SETTINGS_KEY,
    initialLoad: over.initialLoad,
    readSyncInitial: over.readSyncInitial,
    registerOnlineRetry: () => () => {},
  };
}

describe("createTabPreferenceStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("lazy initialLoad", () => {
    it("storage の tabPreference を ensureLoaded で読み込む", async () => {
      const stored = {
        tabs: ["home", "daily"] as TabKey[],
        updatedAt: "2026-01-01T00:00:00.000Z",
        syncStatus: "synced" as const,
      };
      const storage = createMemoryStorage({
        [SETTINGS_KEY]: JSON.stringify({ tabPreference: stored }),
      });
      const store = createTabPreferenceStore(
        baseDeps({
          storage,
          transport: echoTransport(),
          initialLoad: "lazy",
        }),
      );

      await store.ensureLoaded();
      const next = await store.reconcileTabPreferenceFromServer({
        tabs: ["home", "daily"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      expect(next.tabs).toEqual(["home", "daily"]);
    });

    it("storage が空なら default になる", async () => {
      const storage = createMemoryStorage();
      const store = createTabPreferenceStore(
        baseDeps({
          storage,
          transport: echoTransport(),
          initialLoad: "lazy",
        }),
      );
      await store.ensureLoaded();
      const next = await store.reconcileTabPreferenceFromServer(
        createDefaultTabPreference(),
      );
      expect(next.tabs).toEqual([...DEFAULT_TAB_KEYS]);
    });
  });

  describe("savePendingTabPreference", () => {
    it("pending としてローカルに保存し storage に永続化する", async () => {
      const storage = createMemoryStorage();
      const transport = echoTransport();
      const store = createTabPreferenceStore(
        baseDeps({ storage, transport, initialLoad: "lazy" }),
      );

      const saved = await store.savePendingTabPreference(["home", "stats"]);
      expect(saved.syncStatus).toBe("pending");
      expect(saved.tabs).toEqual(["home", "stats"]);

      const persisted = JSON.parse(storage.raw().get(SETTINGS_KEY) ?? "{}");
      expect(persisted.tabPreference.tabs).toEqual(["home", "stats"]);
      expect(persisted.tabPreference.syncStatus).toBe("pending");
    });

    it("既存の他設定キーを保持する", async () => {
      const storage = createMemoryStorage({
        [SETTINGS_KEY]: JSON.stringify({ theme: "dark" }),
      });
      const store = createTabPreferenceStore(
        baseDeps({
          storage,
          transport: echoTransport(),
          initialLoad: "lazy",
        }),
      );
      await store.savePendingTabPreference(["home", "tasks"]);
      const persisted = JSON.parse(storage.raw().get(SETTINGS_KEY) ?? "{}");
      expect(persisted.theme).toBe("dark");
    });
  });

  describe("flushPendingTabPreference", () => {
    it("pending を server へ flush し synced にする", async () => {
      const storage = createMemoryStorage();
      const transport = echoTransport();
      const store = createTabPreferenceStore(
        baseDeps({ storage, transport, initialLoad: "lazy" }),
      );

      await store.savePendingTabPreference(["home", "goals"]);
      const flushed = await store.flushPendingTabPreference();

      expect(transport.putTabPreference).toHaveBeenCalled();
      expect(flushed.syncStatus).toBe("synced");
    });

    it("pending でなければ transport を呼ばない", async () => {
      const storage = createMemoryStorage();
      const transport = echoTransport();
      const store = createTabPreferenceStore(
        baseDeps({ storage, transport, initialLoad: "lazy" }),
      );
      await store.ensureLoaded();
      await store.flushPendingTabPreference();
      expect(transport.putTabPreference).not.toHaveBeenCalled();
    });

    it("5xx の場合は retry をスケジュールし pending のまま", async () => {
      const storage = createMemoryStorage();
      const failing = statusTransport(503);
      const store = createTabPreferenceStore(
        baseDeps({ storage, transport: failing, initialLoad: "lazy" }),
      );
      await store.savePendingTabPreference(["home", "daily"]);
      const result = await store.flushPendingTabPreference();
      expect(result.syncStatus).toBe("pending");
      // 再試行タイマーが積まれている
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe("clearStoredTabPreference", () => {
    it("default に戻し storage から tabPreference を削除する", async () => {
      const storage = createMemoryStorage({
        [SETTINGS_KEY]: JSON.stringify({
          theme: "dark",
          tabPreference: {
            tabs: ["home", "stats"],
            updatedAt: "2026-01-01T00:00:00.000Z",
            syncStatus: "synced",
          },
        }),
      });
      const store = createTabPreferenceStore(
        baseDeps({
          storage,
          transport: echoTransport(),
          initialLoad: "lazy",
        }),
      );
      await store.clearStoredTabPreference();
      const persisted = JSON.parse(storage.raw().get(SETTINGS_KEY) ?? "{}");
      expect(persisted.tabPreference).toBeUndefined();
      expect(persisted.theme).toBe("dark");
    });
  });

  describe("sync initialLoad", () => {
    it("readSyncInitial の値で初期化される", () => {
      const storage = createMemoryStorage();
      const initial = {
        tabs: ["home", "tasks"] as TabKey[],
        updatedAt: "2026-04-01T00:00:00.000Z",
        syncStatus: "synced" as const,
      };
      const store = createTabPreferenceStore(
        baseDeps({
          storage,
          transport: echoTransport(),
          initialLoad: "sync",
          readSyncInitial: () => initial,
        }),
      );
      const { result } = renderHook(() => store.useTabPreference());
      expect(result.current.preference.tabs).toEqual(["home", "tasks"]);
    });
  });

  describe("subscribeExternalChange", () => {
    it("外部変更通知で storage を読み直す", async () => {
      const storage = createMemoryStorage();
      const triggerRef: { current: (() => void) | null } = { current: null };
      const store = createTabPreferenceStore({
        react: { useEffect },
        useSyncExternalStore,
        storage,
        transport: echoTransport(),
        settingsKey: SETTINGS_KEY,
        initialLoad: "lazy",
        registerOnlineRetry: () => () => {},
        subscribeExternalChange: (reload) => {
          triggerRef.current = reload;
          return () => {};
        },
      });

      const { result } = renderHook(() => store.useTabPreference());
      // subscribe 時に external change が登録される
      expect(triggerRef.current).not.toBeNull();

      await storage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          tabPreference: {
            tabs: ["home", "goals"],
            updatedAt: "2026-05-01T00:00:00.000Z",
            syncStatus: "synced",
          },
        }),
      );
      triggerRef.current?.();
      // reload は非同期で emit するため flush 待ち
      await vi.waitFor(() => {
        expect(result.current.preference.tabs).toEqual(["home", "goals"]);
      });
    });
  });
});
