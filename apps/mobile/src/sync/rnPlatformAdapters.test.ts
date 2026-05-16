import { beforeEach, describe, expect, it, vi } from "vitest";

type NetInfoState = { isConnected: boolean };

// NetInfo.addEventListener はモジュールロード時に呼ばれるので hoisted mock 必須。
// `mock.calls[0][0]` でリスナーを取り出せるよう、引数型を明示する。
const mocks = vi.hoisted(() => ({
  netInfoAddEventListener: vi.fn<
    (listener: (state: { isConnected: boolean }) => void) => () => void
  >(() => () => {}),
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: mocks.netInfoAddEventListener },
}));

vi.mock("../utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getAllKeys: vi.fn(),
    multiGet: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

async function loadFresh() {
  vi.resetModules();
  mocks.netInfoAddEventListener.mockClear();
  const mod = await import("./rnPlatformAdapters");
  const firstCall = mocks.netInfoAddEventListener.mock.calls[0];
  const netInfoListener: ((state: NetInfoState) => void) | undefined = firstCall
    ? firstCall[0]
    : undefined;
  return { ...mod, netInfoListener };
}

describe("rnPlatformAdapters forced offline", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("初期状態は online (forcedOffline=false, NetInfo cachedOnline=true)", async () => {
    const { rnNetworkAdapter, isForcedOffline } = await loadFresh();
    expect(rnNetworkAdapter.isOnline()).toBe(true);
    expect(isForcedOffline()).toBe(false);
  });

  it("setForcedOffline(true) で isOnline が false", async () => {
    const { rnNetworkAdapter, setForcedOffline, isForcedOffline } =
      await loadFresh();
    setForcedOffline(true);
    expect(rnNetworkAdapter.isOnline()).toBe(false);
    expect(isForcedOffline()).toBe(true);
  });

  it("forced offline → online 遷移で onOnline listener が発火", async () => {
    const { rnNetworkAdapter, setForcedOffline } = await loadFresh();
    const callback = vi.fn();
    rnNetworkAdapter.onOnline(callback);

    // online→offline では発火しない
    setForcedOffline(true);
    expect(callback).not.toHaveBeenCalled();

    // offline→online で 1 回だけ発火
    setForcedOffline(false);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("同じ状態を連続で setForcedOffline しても発火しない", async () => {
    const { rnNetworkAdapter, setForcedOffline } = await loadFresh();
    const callback = vi.fn();
    rnNetworkAdapter.onOnline(callback);

    setForcedOffline(false); // online → online (no-op)
    expect(callback).not.toHaveBeenCalled();

    setForcedOffline(true);
    setForcedOffline(true); // offline → offline (no-op)
    expect(callback).not.toHaveBeenCalled();
  });

  it("unsubscribe 後は listener が呼ばれない", async () => {
    const { rnNetworkAdapter, setForcedOffline } = await loadFresh();
    const callback = vi.fn();
    const unsubscribe = rnNetworkAdapter.onOnline(callback);

    setForcedOffline(true);
    setForcedOffline(false);
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    setForcedOffline(true);
    setForcedOffline(false);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("NetInfo offline→online でも onOnline listener が発火する", async () => {
    const { rnNetworkAdapter, netInfoListener } = await loadFresh();
    expect(netInfoListener).toBeDefined();
    const callback = vi.fn();
    rnNetworkAdapter.onOnline(callback);

    netInfoListener!({ isConnected: false });
    expect(rnNetworkAdapter.isOnline()).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    netInfoListener!({ isConnected: true });
    expect(rnNetworkAdapter.isOnline()).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("NetInfo online でも forcedOffline=true なら isOnline=false のまま", async () => {
    const { rnNetworkAdapter, setForcedOffline, netInfoListener } =
      await loadFresh();
    expect(netInfoListener).toBeDefined();
    setForcedOffline(true);
    netInfoListener!({ isConnected: true });
    expect(rnNetworkAdapter.isOnline()).toBe(false);

    // forced を解除して初めて online と判定される
    setForcedOffline(false);
    expect(rnNetworkAdapter.isOnline()).toBe(true);
  });
});
