import { describe, expect, it, vi } from "vitest";

vi.mock("../sync/syncEngine", () => ({
  syncEngine: { syncAll: vi.fn(), mutex: {}, startAutoSync: vi.fn() },
}));
vi.mock("../sync/rnPlatformAdapters", () => ({
  rnNetworkAdapter: { isOnline: () => true, onOnline: () => () => {} },
}));
vi.mock("./useNavigationSync", () => ({
  getNavigationSync: vi.fn(),
  useNavigationSync: vi.fn(),
}));

import { handleAppStateChange } from "./useSyncEngine";

function createDeps() {
  const trigger = vi.fn();
  return {
    trigger,
    deps: {
      getNavigationSync: vi.fn(() => ({ trigger, run: vi.fn() })),
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
