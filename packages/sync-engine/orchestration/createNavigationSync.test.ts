import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createNavigationSync } from "./createNavigationSync";
import { createSyncMutex } from "./createSyncMutex";

type Deps = {
  syncAll: Mock;
  pullSync: Mock;
  isOnline: Mock;
  mutex: ReturnType<typeof createSyncMutex>;
  onError: Mock;
  callOrder: string[];
};

// 本番配線と同じく syncAll も同一 mutex を経由させる（createSyncEngine.syncAll は
// mutex.run で包まれ、busy なら何もしない）。
function createDeps(mutex = createSyncMutex()): Deps {
  const callOrder: string[] = [];
  const pullSync = vi.fn(async () => {
    callOrder.push("pull");
  });
  const syncAll = vi.fn(() =>
    mutex.run(async () => {
      callOrder.push("push");
    }),
  );
  return {
    syncAll,
    pullSync,
    isOnline: vi.fn().mockReturnValue(true),
    mutex,
    onError: vi.fn(),
    callOrder,
  };
}

/** 外部から mutex を握る。resolve するまで busy のまま */
function holdMutex(mutex: ReturnType<typeof createSyncMutex>) {
  let release!: () => void;
  const blocks = new Promise<void>((r) => {
    release = r;
  });
  const done = mutex.run(() => blocks);
  return { release, done };
}

describe("createNavigationSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("trigger", () => {
    it("calls pullSync then syncAll", async () => {
      const deps = createDeps();
      createNavigationSync(deps).trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.callOrder).toEqual(["pull", "push"]);
    });

    it("skips when offline", async () => {
      const deps = createDeps();
      deps.isOnline.mockReturnValue(false);
      createNavigationSync(deps).trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.callOrder).toEqual([]);
    });

    it("throttles for 5 seconds after a completed sync (boundary)", async () => {
      const deps = createDeps();
      const { trigger } = createNavigationSync(deps);
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(4999);
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(2);
    });

    it("waits for a busy mutex, then pulls and pushes (Web reload order)", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      // startAutoSync の即時 syncAll が先に mutex を取った状態
      const held = holdMutex(mutex);
      createNavigationSync(deps).trigger();
      await vi.advanceTimersByTimeAsync(300);
      expect(deps.pullSync).not.toHaveBeenCalled();

      held.release();
      await held.done;
      await vi.advanceTimersByTimeAsync(200);
      expect(deps.callOrder).toEqual(["pull", "push"]);
      expect(deps.onError).not.toHaveBeenCalled();
    });

    it("coalesces triggers while a sync is in flight", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      const held = holdMutex(mutex);
      const { trigger } = createNavigationSync(deps);
      trigger();
      trigger();
      trigger();
      held.release();
      await held.done;
      await vi.advanceTimersByTimeAsync(200);
      expect(deps.pullSync).toHaveBeenCalledTimes(1);
      expect(deps.syncAll).toHaveBeenCalledTimes(1);
    });

    it("after the pull gave up, keeps the 5s floor and then retries", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      const held = holdMutex(mutex);
      const { trigger } = createNavigationSync(deps);
      trigger();
      await vi.advanceTimersByTimeAsync(10500);
      expect(deps.pullSync).not.toHaveBeenCalled();

      held.release();
      await held.done;
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(1);
    });

    it("keeps the 5s floor after a failed pull (no retry storm)", async () => {
      const deps = createDeps();
      deps.pullSync.mockRejectedValue(new Error("pull failed"));
      const { trigger } = createNavigationSync(deps);
      for (let i = 0; i < 6; i++) {
        trigger();
        await vi.advanceTimersByTimeAsync(5);
      }
      expect(deps.pullSync).toHaveBeenCalledTimes(1);
      expect(deps.onError).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(2);
    });

    it("calls syncAll even when pullSync errors, and reports via onError", async () => {
      const deps = createDeps();
      deps.pullSync.mockRejectedValue(new Error("pull failed"));
      createNavigationSync(deps).trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.onError).toHaveBeenCalledWith(expect.any(Error), "pull");
      expect(deps.callOrder).toEqual(["push"]);
    });

    it("reports syncAll errors via onError", async () => {
      const deps = createDeps();
      deps.syncAll.mockRejectedValue(new Error("push failed"));
      createNavigationSync(deps).trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.onError).toHaveBeenCalledWith(expect.any(Error), "push");
    });
  });

  describe("run", () => {
    it("bypasses the throttle and resolves after pull and push", async () => {
      const deps = createDeps();
      const sync = createNavigationSync(deps);
      sync.trigger();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await sync.run();
      expect(result).toEqual({ pulled: true });
      expect(deps.callOrder).toEqual(["pull", "push", "pull", "push"]);
    });

    it("skips when offline", async () => {
      const deps = createDeps();
      deps.isOnline.mockReturnValue(false);
      expect(await createNavigationSync(deps).run()).toEqual({
        pulled: false,
      });
      expect(deps.callOrder).toEqual([]);
    });

    it("throttles a following trigger from the completion time", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      const held = holdMutex(mutex);
      const sync = createNavigationSync(deps);
      const running = sync.run();
      await vi.advanceTimersByTimeAsync(6000);
      held.release();
      await held.done;
      await vi.advanceTimersByTimeAsync(200);
      await running;
      expect(deps.pullSync).toHaveBeenCalledTimes(1);

      // 開始から 6 秒以上経っているが、完了直後なので間引かれる
      sync.trigger();
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.pullSync).toHaveBeenCalledTimes(1);
    });

    it("joins an in-flight trigger instead of starting a second sync", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      const held = holdMutex(mutex);
      const sync = createNavigationSync(deps);
      sync.trigger();
      const running = sync.run();
      held.release();
      await held.done;
      await vi.advanceTimersByTimeAsync(200);
      expect(await running).toEqual({ pulled: true });
      expect(deps.pullSync).toHaveBeenCalledTimes(1);
      expect(deps.syncAll).toHaveBeenCalledTimes(1);
    });

    it("gives up after the wait cap: nothing runs, pulled=false, no onError", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      holdMutex(mutex);
      const running = createNavigationSync(deps).run();
      await vi.advanceTimersByTimeAsync(10500);
      expect(await running).toEqual({ pulled: false });
      // syncAll は呼ばれるが mutex 経由なので実行されない（本番配線と同じ）
      expect(deps.syncAll).toHaveBeenCalledTimes(1);
      expect(deps.callOrder).toEqual([]);
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("drops a pull waiting for the mutex and skips the push", async () => {
      const mutex = createSyncMutex();
      const deps = createDeps(mutex);
      const held = holdMutex(mutex);
      const sync = createNavigationSync(deps);
      const running = sync.run();
      await vi.advanceTimersByTimeAsync(300);

      sync.cancel();
      held.release();
      await held.done;
      await vi.advanceTimersByTimeAsync(200);
      expect(await running).toEqual({ pulled: false });
      expect(deps.pullSync).not.toHaveBeenCalled();
      expect(deps.syncAll).not.toHaveBeenCalled();
    });

    it("makes later trigger/run no-ops", async () => {
      const deps = createDeps();
      const sync = createNavigationSync(deps);
      sync.cancel();
      sync.trigger();
      expect(await sync.run()).toEqual({ pulled: false });
      await vi.advanceTimersByTimeAsync(0);
      expect(deps.callOrder).toEqual([]);
    });
  });
});
