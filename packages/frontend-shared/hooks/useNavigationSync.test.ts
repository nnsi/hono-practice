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

    it("keeps a single slot: switching users cancels and recreates the instance", async () => {
      const s = setup();
      const first = s.getNavigationSync("u1");
      expect(s.getNavigationSync("u2")).not.toBe(first);
      expect(s.getNavigationSync("u1")).not.toBe(first);

      // 旧インスタンスは cancel 済みで何もしない
      await first.run();
      expect(s.pullSync).not.toHaveBeenCalled();
    });

    it("discardNavigationSync cancels the current instance", async () => {
      const s = setup();
      const sync = s.getNavigationSync("u1");
      s.discardNavigationSync();
      expect(await sync.run()).toEqual({ pulled: false });
      expect(s.pullSync).not.toHaveBeenCalled();
      expect(s.getNavigationSync("u1")).not.toBe(sync);
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

    it("cancels a pull waiting for the mutex when the user logs out", async () => {
      const s = setup("/daily");
      let release!: () => void;
      const held = s.mutex.run(
        () =>
          new Promise<void>((r) => {
            release = r;
          }),
      );
      const hook = renderHook(
        ({ uid }: { uid: string | null }) => s.useNavigationSync(true, uid),
        { initialProps: { uid: "u1" as string | null } },
      );
      await vi.advanceTimersByTimeAsync(300);
      expect(s.pullSync).not.toHaveBeenCalled();

      hook.rerender({ uid: null });
      release();
      await held;
      await vi.advanceTimersByTimeAsync(500);
      expect(s.pullSync).not.toHaveBeenCalled();
      expect(s.syncAll).not.toHaveBeenCalled();
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
