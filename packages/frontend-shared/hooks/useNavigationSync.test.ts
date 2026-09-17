import { useEffect } from "react";

import { createSyncMutex } from "@packages/sync-engine";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUseNavigationSync } from "./useNavigationSync";

function setup(pathname = "/") {
  const deps = {
    syncAll: vi.fn().mockResolvedValue(undefined),
    pullSync: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn().mockReturnValue(true),
    mutex: createSyncMutex(),
    onError: vi.fn(),
  };
  let currentPathname = pathname;
  const factory = createUseNavigationSync({
    react: { useEffect },
    usePathname: () => currentPathname,
    ...deps,
  });
  const setPathname = (next: string) => {
    currentPathname = next;
  };
  return { ...deps, ...factory, setPathname };
}

describe("createUseNavigationSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getNavigationSync", () => {
    it("returns the same instance for the same userId", () => {
      const { getNavigationSync } = setup();
      expect(getNavigationSync("u1")).toBe(getNavigationSync("u1"));
    });

    it("keeps a single slot: switching users recreates the instance", () => {
      const { getNavigationSync } = setup();
      const first = getNavigationSync("u1");
      expect(getNavigationSync("u2")).not.toBe(first);
      expect(getNavigationSync("u1")).not.toBe(first);
    });

    it("run() pulls with the bound userId then pushes", async () => {
      const { getNavigationSync, pullSync, syncAll } = setup();
      await getNavigationSync("u1").run();
      expect(pullSync).toHaveBeenCalledWith("u1");
      expect(syncAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("useNavigationSync", () => {
    it("triggers once on mount and again when the pathname changes", async () => {
      const s = setup("/daily");
      const hook = renderHook(() => s.useNavigationSync(true, "u1"));
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(6000);
      s.setPathname("/tasks");
      hook.rerender();
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(2);
    });

    it("does not trigger on re-render with the same pathname", async () => {
      const s = setup("/daily");
      const hook = renderHook(() => s.useNavigationSync(true, "u1"));
      await vi.advanceTimersByTimeAsync(6000);
      hook.rerender();
      hook.rerender();
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(1);
    });

    it("shares throttle state with getNavigationSync", async () => {
      const s = setup("/daily");
      renderHook(() => s.useNavigationSync(true, "u1"));
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(1);

      s.getNavigationSync("u1").trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(1);
    });

    it("does nothing until syncReady and userId are set, then triggers", async () => {
      const s = setup("/daily");
      const hook = renderHook(
        ({ ready, uid }: { ready: boolean; uid: string | null }) =>
          s.useNavigationSync(ready, uid),
        { initialProps: { ready: false, uid: "u1" as string | null } },
      );
      hook.rerender({ ready: true, uid: null });
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).not.toHaveBeenCalled();

      hook.rerender({ ready: true, uid: "u1" });
      await vi.advanceTimersByTimeAsync(0);
      expect(s.pullSync).toHaveBeenCalledTimes(1);
    });
  });
});
