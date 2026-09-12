import type { AuthDiagnosticObserver } from "@packages/types/authDiagnostics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  options: undefined as
    | {
        apiUrl: string;
        platform: string;
        appVersion?: string;
        runtimeVersion?: string;
        updateId?: string;
        createId?: () => string;
        storage?: {
          getItem(key: string): Promise<string | null>;
          setItem(key: string, value: string): Promise<void>;
          getAllKeys(): Promise<readonly string[]>;
          removeItem(key: string): Promise<void>;
        };
      }
    | undefined,
  flush: vi.fn<() => Promise<void>>(),
  observe: vi.fn<AuthDiagnosticObserver>(),
  createId: vi.fn(() => "f8e28e2b-f9e6-4b0b-9c37-503a3f2b0028"),
}));

vi.mock("@packages/auth-client/authDiagnosticReporter", () => ({
  createAuthDiagnosticReporter: vi.fn((options) => {
    mocks.options = options;
    return {
      flowId: options.createId(),
      observe: mocks.observe,
      flush: mocks.flush,
    };
  }),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    getAllKeys: vi.fn().mockResolvedValue([]),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("../api/apiClient", () => ({ getApiUrl: () => "https://api.test" }));
vi.mock("expo-constants", () => ({
  default: { expoConfig: { version: "1.2.3" } },
}));
vi.mock("expo-crypto", () => ({ randomUUID: mocks.createId }));
vi.mock("expo-updates", () => ({
  runtimeVersion: "1.2.0",
  updateId: "7d67a30f-bd98-440c-a3e5-b33a616e2ecd",
}));

import {
  mobileAuthDiagnosticHeaders,
  mobileAuthDiagnostics,
  startMobileAuthDiagnosticFlush,
} from "./mobileAuthDiagnostics";

let notifyOnline: (state: NetInfoState) => void;
let notifyAppState: (state: AppStateStatus) => void;
const unsubscribe = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.flush.mockResolvedValue();
  vi.mocked(NetInfo.addEventListener).mockImplementation((handler) => {
    notifyOnline = handler;
    handler({ isConnected: true } as NetInfoState);
    return unsubscribe;
  });
  vi.mocked(AppState.addEventListener).mockImplementation((_event, handler) => {
    notifyAppState = handler;
    return { remove };
  });
});

describe("mobile auth diagnostic wiring", () => {
  it("既存 Expo 情報と AsyncStorage を reporter に渡し、flow ID を refresh header に使う", async () => {
    expect(mocks.options).toMatchObject({
      apiUrl: "https://api.test",
      platform: "web",
      appVersion: "1.2.3",
      runtimeVersion: "1.2.0",
      updateId: "7d67a30f-bd98-440c-a3e5-b33a616e2ecd",
      createId: mocks.createId,
    });
    expect(mobileAuthDiagnosticHeaders).toEqual({
      "X-Auth-Diagnostic-Id": mobileAuthDiagnostics.flowId,
      "X-Client-Platform": "web",
    });
    vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue(["diagnostic-test"]);
    await mocks.options?.storage?.getItem("diagnostic-test");
    await mocks.options?.storage?.setItem("diagnostic-test", "[]");
    await expect(mocks.options?.storage?.getAllKeys()).resolves.toEqual([
      "diagnostic-test",
    ]);
    await mocks.options?.storage?.removeItem("diagnostic-test");
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("diagnostic-test");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("diagnostic-test", "[]");
    expect(AsyncStorage.getAllKeys).toHaveBeenCalledExactlyOnceWith();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("diagnostic-test");
  });

  it("起動・実際の再接続・foreground 復帰で flush する", () => {
    const cleanup = startMobileAuthDiagnosticFlush();
    expect(mocks.flush).toHaveBeenCalledTimes(1);
    notifyOnline({ isConnected: true } as NetInfoState);
    expect(mocks.flush).toHaveBeenCalledTimes(1);
    notifyOnline({ isConnected: false } as NetInfoState);
    notifyOnline({ isConnected: true } as NetInfoState);
    expect(mocks.flush).toHaveBeenCalledTimes(2);
    notifyAppState("background");
    expect(mocks.flush).toHaveBeenCalledTimes(2);
    notifyAppState("active");
    expect(mocks.flush).toHaveBeenCalledTimes(3);
    cleanup();
  });

  it("cleanup で購読を解除し、遅延通知が来ても flush しない", () => {
    const cleanup = startMobileAuthDiagnosticFlush();
    notifyOnline({ isConnected: false } as NetInfoState);
    cleanup();
    notifyOnline({ isConnected: true } as NetInfoState);
    notifyAppState("active");

    expect(mocks.flush).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("flush 失敗は呼び出し元へ伝播しない", async () => {
    mocks.flush.mockRejectedValue(new Error("offline"));
    const cleanup = startMobileAuthDiagnosticFlush();
    await Promise.resolve();
    notifyAppState("active");
    await Promise.resolve();
    cleanup();

    expect(mocks.flush).toHaveBeenCalledTimes(2);
  });
});
