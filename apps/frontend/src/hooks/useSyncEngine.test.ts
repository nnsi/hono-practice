import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    discardNavigationSync: vi.fn(),
    startAutoSync: vi.fn(() => vi.fn()),
  };
});

vi.mock("../sync/syncEngine", () => ({
  syncEngine: { startAutoSync: mocks.startAutoSync, mutex: {} },
}));
vi.mock("../sync/webPlatformAdapters", () => ({
  webNetworkAdapter: {
    isOnline: () => true,
    onOnline: (cb: () => void) => {
      mocks.onlineListeners.add(cb);
      return () => mocks.onlineListeners.delete(cb);
    },
  },
}));
vi.mock("./useNavigationSync", () => ({
  getNavigationSync: mocks.getNavigationSync,
  discardNavigationSync: mocks.discardNavigationSync,
  useNavigationSync: vi.fn(),
}));

import { useSyncEngine } from "./useSyncEngine";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useSyncEngine (web)", () => {
  beforeEach(() => {
    mocks.trigger.mockClear();
    mocks.getNavigationSync.mockClear();
    mocks.onlineListeners.clear();
  });
  afterEach(() => {
    setVisibility("visible");
  });

  it("triggers the full sync when the tab becomes visible", () => {
    renderHook(() => useSyncEngine(true, "u1"));
    setVisibility("hidden");
    expect(mocks.trigger).not.toHaveBeenCalled();
    setVisibility("visible");
    expect(mocks.getNavigationSync).toHaveBeenCalledWith("u1");
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });

  it("triggers the full sync when coming back online", () => {
    renderHook(() => useSyncEngine(true, "u1"));
    expect(mocks.onlineListeners.size).toBe(1);
    for (const cb of mocks.onlineListeners) cb();
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });

  it("does not listen while logged out or without a userId, and unsubscribes on logout", () => {
    const hook = renderHook(
      ({ loggedIn, uid }: { loggedIn: boolean; uid: string | null }) =>
        useSyncEngine(loggedIn, uid),
      { initialProps: { loggedIn: true, uid: null as string | null } },
    );
    setVisibility("visible");
    expect(mocks.trigger).not.toHaveBeenCalled();

    hook.rerender({ loggedIn: true, uid: "u1" });
    expect(mocks.onlineListeners.size).toBe(1);
    mocks.discardNavigationSync.mockClear();

    hook.rerender({ loggedIn: false, uid: "u1" });
    expect(mocks.onlineListeners.size).toBe(0);
    expect(mocks.discardNavigationSync).toHaveBeenCalledTimes(1);
    setVisibility("visible");
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("re-registers for the new user when userId changes", () => {
    const hook = renderHook(
      ({ uid }: { uid: string | null }) => useSyncEngine(true, uid),
      { initialProps: { uid: "u1" as string | null } },
    );
    hook.rerender({ uid: "u2" });
    expect(mocks.onlineListeners.size).toBe(1);
    setVisibility("visible");
    expect(mocks.getNavigationSync).toHaveBeenLastCalledWith("u2");
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });
});
