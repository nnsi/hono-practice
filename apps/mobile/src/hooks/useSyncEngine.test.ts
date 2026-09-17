// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { AppState } from "react-native";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const trigger = vi.fn();
  const onlineListeners = new Set<() => void>();
  return {
    trigger,
    onlineListeners,
    getNavigationSync: vi.fn(() => ({
      trigger,
      run: vi.fn(),
      cancel: vi.fn(),
    })),
    syncAll: vi.fn().mockResolvedValue(undefined),
    startAutoSync: vi.fn(() => vi.fn()),
  };
});

vi.mock("../sync/syncEngine", () => ({
  syncEngine: {
    syncAll: mocks.syncAll,
    mutex: {},
    startAutoSync: mocks.startAutoSync,
  },
}));
vi.mock("../sync/rnPlatformAdapters", () => ({
  rnNetworkAdapter: {
    isOnline: () => true,
    onOnline: (cb: () => void) => {
      mocks.onlineListeners.add(cb);
      return () => mocks.onlineListeners.delete(cb);
    },
  },
}));
vi.mock("./useNavigationSync", () => ({
  getNavigationSync: mocks.getNavigationSync,
  useNavigationSync: vi.fn(),
}));

import { handleAppStateChange, useSyncEngine } from "./useSyncEngine";

function createDeps() {
  const trigger = vi.fn();
  return {
    trigger,
    deps: {
      getNavigationSync: vi.fn(() => ({
        trigger,
        run: vi.fn(),
        cancel: vi.fn(),
      })),
      syncAll: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("handleAppStateChange", () => {
  it("runs the full sync for the user when becoming active", () => {
    const { deps, trigger } = createDeps();
    handleAppStateChange("active", "u1", deps);
    expect(deps.getNavigationSync).toHaveBeenCalledWith("u1");
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(deps.syncAll).not.toHaveBeenCalled();
  });

  it("falls back to push only when userId is unknown", () => {
    const { deps, trigger } = createDeps();
    handleAppStateChange("active", null, deps);
    expect(trigger).not.toHaveBeenCalled();
    expect(deps.syncAll).toHaveBeenCalledTimes(1);
  });

  it("ignores background and inactive", () => {
    const { deps, trigger } = createDeps();
    handleAppStateChange("background", "u1", deps);
    handleAppStateChange("inactive", "u1", deps);
    expect(trigger).not.toHaveBeenCalled();
    expect(deps.syncAll).not.toHaveBeenCalled();
  });
});

describe("useSyncEngine (mobile wiring)", () => {
  const addEventListener = AppState.addEventListener as unknown as Mock;

  beforeEach(() => {
    mocks.trigger.mockClear();
    mocks.getNavigationSync.mockClear();
    mocks.onlineListeners.clear();
    addEventListener.mockClear();
  });

  it("subscribes to AppState and runs the full sync on active", () => {
    renderHook(() => useSyncEngine(true, "u1"));
    expect(addEventListener).toHaveBeenCalledTimes(1);
    const handler = addEventListener.mock.calls[0][1] as (s: string) => void;
    handler("background");
    expect(mocks.trigger).not.toHaveBeenCalled();
    handler("active");
    expect(mocks.getNavigationSync).toHaveBeenCalledWith("u1");
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });

  it("runs the full sync when coming back online and unsubscribes on logout", () => {
    const hook = renderHook(
      ({ loggedIn }: { loggedIn: boolean }) => useSyncEngine(loggedIn, "u1"),
      { initialProps: { loggedIn: true } },
    );
    expect(mocks.onlineListeners.size).toBe(1);
    for (const cb of mocks.onlineListeners) cb();
    expect(mocks.trigger).toHaveBeenCalledTimes(1);

    const remove = addEventListener.mock.results[0].value.remove as Mock;
    hook.rerender({ loggedIn: false });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mocks.onlineListeners.size).toBe(0);
  });
});
