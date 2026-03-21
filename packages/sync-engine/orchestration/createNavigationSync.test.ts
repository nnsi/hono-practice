import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import { createNavigationSync } from "./createNavigationSync";
import { createSyncMutex } from "./createSyncMutex";

type MockDeps = {
  syncAll: Mock;
  pullSync: Mock;
  isOnline: Mock;
  mutex: ReturnType<typeof createSyncMutex>;
  onError: Mock;
};

function createDeps(mutex = createSyncMutex()): MockDeps {
  return {
    syncAll: vi.fn().mockResolvedValue(undefined),
    pullSync: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn().mockReturnValue(true),
    mutex,
    onError: vi.fn(),
  };
}

describe("createNavigationSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("calls pullSync then syncAll on trigger", async () => {
    const deps = createDeps();
    const callOrder: string[] = [];
    deps.pullSync.mockImplementation(async () => {
      callOrder.push("pull");
    });
    deps.syncAll.mockImplementation(async () => {
      callOrder.push("push");
    });

    const trigger = createNavigationSync(deps);
    trigger();
    await vi.advanceTimersByTimeAsync(0);

    expect(callOrder).toEqual(["pull", "push"]);
  });

  it("skips when offline", async () => {
    const deps = createDeps();
    deps.isOnline.mockReturnValue(false);
    const trigger = createNavigationSync(deps);
    trigger();
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.pullSync).not.toHaveBeenCalled();
    expect(deps.syncAll).not.toHaveBeenCalled();
  });

  it("throttles within 5 seconds", async () => {
    const deps = createDeps();
    const trigger = createNavigationSync(deps);

    trigger();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).toHaveBeenCalledTimes(1);

    // Second trigger within throttle window -- skipped
    vi.advanceTimersByTime(3000);
    trigger();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).toHaveBeenCalledTimes(1);

    // After throttle window -- allowed
    vi.advanceTimersByTime(3000);
    trigger();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).toHaveBeenCalledTimes(2);
  });

  it("skips pullSync when mutex is busy", async () => {
    const mutex = createSyncMutex();
    const deps = createDeps(mutex);

    // Hold the mutex externally
    let resolveExternal: () => void;
    const externalBlocks = new Promise<void>((r) => {
      resolveExternal = r;
    });
    const externalPromise = mutex.run(() => externalBlocks);

    const trigger = createNavigationSync(deps);
    trigger();
    await vi.advanceTimersByTimeAsync(0);

    // pullSync should NOT have been called (mutex was busy)
    expect(deps.pullSync).not.toHaveBeenCalled();
    // syncAll is called after pull (even if pull was skipped),
    // and syncAll also uses the same mutex internally
    expect(deps.syncAll).toHaveBeenCalledTimes(1);

    resolveExternal!();
    await externalPromise;
  });

  it("calls syncAll even when pullSync errors", async () => {
    const deps = createDeps();
    deps.pullSync.mockRejectedValue(new Error("pull failed"));

    const trigger = createNavigationSync(deps);
    trigger();
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.onError).toHaveBeenCalledTimes(1);
    expect(deps.syncAll).toHaveBeenCalledTimes(1);
  });

  it("reports syncAll errors via onError", async () => {
    const deps = createDeps();
    deps.syncAll.mockRejectedValue(new Error("push failed"));

    const trigger = createNavigationSync(deps);
    trigger();
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.onError).toHaveBeenCalledTimes(1);
    expect(deps.onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
