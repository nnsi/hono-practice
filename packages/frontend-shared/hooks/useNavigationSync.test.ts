import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSyncMutex } from "@packages/sync-engine";

import { createUseNavigationSync } from "./useNavigationSync";

function createDeps() {
  return {
    syncAll: vi.fn().mockResolvedValue(undefined),
    pullSync: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn().mockReturnValue(true),
    mutex: createSyncMutex(),
    onError: vi.fn(),
  };
}

// useMemo / useEffect を即時評価する最小の React 代替。
// 依存配列の比較は行わず毎回実行するため、呼び出し回数の検証は
// getNavigationSync 側（React 非依存）に寄せる。
const immediateReact = {
  useMemo: <T>(factory: () => T) => factory(),
  useEffect: (effect: () => void | (() => void)) => {
    effect();
  },
};

describe("createUseNavigationSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns the same instance for the same userId", () => {
    const { getNavigationSync } = createUseNavigationSync({
      react: immediateReact,
      usePathname: () => "/",
      ...createDeps(),
    });
    expect(getNavigationSync("u1")).toBe(getNavigationSync("u1"));
    expect(getNavigationSync("u1")).not.toBe(getNavigationSync("u2"));
  });

  it("run() pulls with the bound userId then pushes", async () => {
    const deps = createDeps();
    const { getNavigationSync } = createUseNavigationSync({
      react: immediateReact,
      usePathname: () => "/",
      ...deps,
    });
    await getNavigationSync("u1").run();
    expect(deps.pullSync).toHaveBeenCalledWith("u1");
    expect(deps.syncAll).toHaveBeenCalledTimes(1);
  });

  it("hook shares throttle state with getNavigationSync", async () => {
    const deps = createDeps();
    const { useNavigationSync, getNavigationSync } = createUseNavigationSync({
      react: immediateReact,
      usePathname: () => "/daily",
      ...deps,
    });
    useNavigationSync(true, "u1");
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).toHaveBeenCalledTimes(1);

    // Foreground trigger right after navigation is throttled
    getNavigationSync("u1").trigger();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).toHaveBeenCalledTimes(1);
  });

  it("hook does nothing until syncReady and userId are set", async () => {
    const deps = createDeps();
    const { useNavigationSync } = createUseNavigationSync({
      react: immediateReact,
      usePathname: () => "/daily",
      ...deps,
    });
    useNavigationSync(false, "u1");
    useNavigationSync(true, null);
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.pullSync).not.toHaveBeenCalled();
  });
});
