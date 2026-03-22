import type { NetworkAdapter } from "@packages/platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSyncEngine } from "./createSyncEngine";
import { createSyncMutex } from "./createSyncMutex";

function createMockFns() {
  return {
    syncActivityIconDeletions: vi.fn().mockResolvedValue(undefined),
    syncActivities: vi.fn().mockResolvedValue(undefined),
    syncActivityIcons: vi.fn().mockResolvedValue(undefined),
    syncActivityLogs: vi.fn().mockResolvedValue(undefined),
    syncGoals: vi.fn().mockResolvedValue(undefined),
    syncGoalFreezePeriods: vi.fn().mockResolvedValue(undefined),
    syncTasks: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockNetwork(online = true): NetworkAdapter {
  return {
    isOnline: vi.fn(() => online),
    onOnline: vi.fn(() => vi.fn()),
  };
}

describe("createSyncEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("syncAll", () => {
    it("calls sync functions in correct order", async () => {
      const fns = createMockFns();
      const callOrder: string[] = [];

      fns.syncActivityIconDeletions.mockImplementation(async () => {
        callOrder.push("iconDeletions");
      });
      fns.syncActivities.mockImplementation(async () => {
        callOrder.push("activities");
      });
      fns.syncActivityIcons.mockImplementation(async () => {
        callOrder.push("activityIcons");
      });
      fns.syncActivityLogs.mockImplementation(async () => {
        callOrder.push("activityLogs");
      });
      fns.syncGoals.mockImplementation(async () => {
        callOrder.push("goals");
      });
      fns.syncTasks.mockImplementation(async () => {
        callOrder.push("tasks");
      });
      fns.syncGoalFreezePeriods.mockImplementation(async () => {
        callOrder.push("goalFreezePeriods");
      });

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      // iconDeletions -> activities -> activityIcons must be in order
      const iconDelIdx = callOrder.indexOf("iconDeletions");
      const activitiesIdx = callOrder.indexOf("activities");
      const activityIconsIdx = callOrder.indexOf("activityIcons");

      expect(iconDelIdx).toBeLessThan(activitiesIdx);
      expect(activitiesIdx).toBeLessThan(activityIconsIdx);

      // tasks must come before activityLogs (FK dependency)
      expect(callOrder.indexOf("tasks")).toBeLessThan(
        callOrder.indexOf("activityLogs"),
      );

      // goalFreezePeriods comes after goals
      expect(callOrder.indexOf("goals")).toBeLessThan(
        callOrder.indexOf("goalFreezePeriods"),
      );
    });

    it("prevents concurrent execution (mutex)", async () => {
      const fns = createMockFns();
      let resolveFirst: () => void;
      const firstBlocks = new Promise<void>((r) => {
        resolveFirst = r;
      });

      fns.syncActivityIconDeletions.mockImplementation(() => firstBlocks);

      const engine = createSyncEngine(fns, createMockNetwork());

      const first = engine.syncAll();
      const second = engine.syncAll();

      await second;

      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(1);

      resolveFirst!();
      await first;

      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(1);
    });

    it("calls onSyncError for each failed step", async () => {
      const fns = createMockFns();
      const onError = vi.fn();
      fns.syncActivityIconDeletions.mockRejectedValueOnce(
        new Error("network error"),
      );
      fns.syncGoals.mockRejectedValueOnce(new Error("goals error"));

      const engine = createSyncEngine(fns, createMockNetwork(), onError);
      await engine.syncAll();

      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        "syncActivityIconDeletions",
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error), "syncGoals");
    });

    it("skips dependent steps when prerequisite fails, but runs independent steps", async () => {
      const fns = createMockFns();
      fns.syncActivities.mockRejectedValueOnce(new Error("fail"));

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      // activityIcons depends on activities → skipped
      expect(fns.syncActivityIcons).not.toHaveBeenCalled();

      // independent steps still run
      expect(fns.syncGoals).toHaveBeenCalled();
      expect(fns.syncTasks).toHaveBeenCalled();
      expect(fns.syncActivityLogs).toHaveBeenCalled();
    });

    it("skips goalFreezePeriods when goals fail", async () => {
      const fns = createMockFns();
      fns.syncGoals.mockRejectedValueOnce(new Error("fail"));

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      expect(fns.syncGoalFreezePeriods).not.toHaveBeenCalled();
      // other steps still run
      expect(fns.syncActivities).toHaveBeenCalled();
      expect(fns.syncTasks).toHaveBeenCalled();
      expect(fns.syncActivityLogs).toHaveBeenCalled();
    });

    it("partial failure does not break mutex", async () => {
      const fns = createMockFns();
      fns.syncGoals.mockRejectedValueOnce(new Error("goals failed"));

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      fns.syncGoals.mockResolvedValue(undefined);
      await engine.syncAll();

      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(2);
    });

    it("resets retryCount on partial success", async () => {
      const fns = createMockFns();
      // only iconDeletions fails — other steps succeed
      fns.syncActivityIconDeletions.mockRejectedValue(new Error("fail"));

      const engine = createSyncEngine(fns, createMockNetwork());
      const cleanup = engine.startAutoSync(30000);

      // First sync: partial success (iconDeletions fails, others succeed)
      await vi.advanceTimersByTimeAsync(0);

      // retryCount should be 0 (partial success) → next sync at 30s, not backoff
      await vi.advanceTimersByTimeAsync(30000);
      // activities called on both syncs
      expect(fns.syncActivities).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it("increments retryCount only when ALL steps fail", async () => {
      const fns = createMockFns();
      const err = new Error("fail");
      fns.syncActivityIconDeletions.mockRejectedValue(err);
      fns.syncActivities.mockRejectedValue(err);
      fns.syncActivityIcons.mockRejectedValue(err);
      fns.syncActivityLogs.mockRejectedValue(err);
      fns.syncGoals.mockRejectedValue(err);
      fns.syncTasks.mockRejectedValue(err);
      fns.syncGoalFreezePeriods.mockRejectedValue(err);

      const engine = createSyncEngine(fns, createMockNetwork());
      const cleanup = engine.startAutoSync(30000);

      // Immediate sync: total failure → retryCount=1
      await vi.advanceTimersByTimeAsync(0);
      expect(fns.syncActivities).toHaveBeenCalledTimes(1);

      // First scheduleNext was called before immediate sync, so delay=30s
      // After 30s: second sync → retryCount=2
      await vi.advanceTimersByTimeAsync(30000);
      expect(fns.syncActivities).toHaveBeenCalledTimes(2);

      // Now scheduleNext uses retryCount=2 → delay=4s
      await vi.advanceTimersByTimeAsync(4000);
      expect(fns.syncActivities).toHaveBeenCalledTimes(3);

      cleanup();
    });
  });

  describe("startAutoSync", () => {
    it("returns cleanup function", () => {
      const fns = createMockFns();
      const engine = createSyncEngine(fns, createMockNetwork(false));

      const cleanup = engine.startAutoSync(60000);

      expect(typeof cleanup).toBe("function");
      cleanup();
    });

    it("performs immediate sync when online", async () => {
      const fns = createMockFns();
      const engine = createSyncEngine(fns, createMockNetwork(true));

      const cleanup = engine.startAutoSync(60000);

      await vi.advanceTimersByTimeAsync(0);

      expect(fns.syncActivityIconDeletions).toHaveBeenCalled();

      cleanup();
    });

    it("does not perform immediate sync when offline", async () => {
      const fns = createMockFns();
      const engine = createSyncEngine(fns, createMockNetwork(false));

      const cleanup = engine.startAutoSync(60000);

      await vi.advanceTimersByTimeAsync(0);

      expect(fns.syncActivityIconDeletions).not.toHaveBeenCalled();

      cleanup();
    });

    it("triggers syncAll via NetworkAdapter when going online", async () => {
      const fns = createMockFns();
      let onlineCallback: (() => void) | null = null;
      const mockNetwork: NetworkAdapter = {
        isOnline: vi.fn().mockReturnValue(false),
        onOnline: vi.fn((cb: () => void) => {
          onlineCallback = cb;
          return () => {
            onlineCallback = null;
          };
        }),
      };

      const engine = createSyncEngine(fns, mockNetwork);
      const cleanup = engine.startAutoSync(60000);

      await vi.advanceTimersByTimeAsync(0);
      expect(fns.syncActivityIconDeletions).not.toHaveBeenCalled();

      (mockNetwork.isOnline as ReturnType<typeof vi.fn>).mockReturnValue(true);
      onlineCallback!();
      await vi.advanceTimersByTimeAsync(0);

      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(1);
      expect(fns.syncActivities).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("does not sync on timer tick when offline", async () => {
      const fns = createMockFns();
      const mockNetwork = createMockNetwork(false);

      const engine = createSyncEngine(fns, mockNetwork);
      const cleanup = engine.startAutoSync(30000);
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(30000);
      expect(fns.syncActivityIconDeletions).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe("shared mutex", () => {
    it("exposes mutex on engine", () => {
      const fns = createMockFns();
      const engine = createSyncEngine(fns, createMockNetwork());
      expect(engine.mutex).toBeDefined();
      expect(typeof engine.mutex.isBusy).toBe("function");
      expect(typeof engine.mutex.run).toBe("function");
    });

    it("uses the injected mutex", async () => {
      const fns = createMockFns();
      const mutex = createSyncMutex();
      const engine = createSyncEngine(
        fns,
        createMockNetwork(),
        undefined,
        mutex,
      );
      expect(engine.mutex).toBe(mutex);
    });

    it("mutex.run is skipped while syncAll holds the lock", async () => {
      const fns = createMockFns();
      const mutex = createSyncMutex();
      let resolveSyncAll: () => void;
      const syncAllBlocks = new Promise<void>((r) => {
        resolveSyncAll = r;
      });
      fns.syncActivityIconDeletions.mockImplementation(() => syncAllBlocks);

      const engine = createSyncEngine(
        fns,
        createMockNetwork(),
        undefined,
        mutex,
      );

      // Start syncAll — it will block on the first step
      const syncAllPromise = engine.syncAll();

      // Attempt to run something else on the same mutex — should be skipped
      const pullRan = vi.fn();
      const result = await mutex.run(async () => {
        pullRan();
      });

      expect(result).toBeUndefined();
      expect(pullRan).not.toHaveBeenCalled();

      // Clean up
      resolveSyncAll!();
      await syncAllPromise;
    });

    it("syncAll is skipped while mutex is held externally", async () => {
      const fns = createMockFns();
      const mutex = createSyncMutex();
      let resolveExternal: () => void;
      const externalBlocks = new Promise<void>((r) => {
        resolveExternal = r;
      });

      const engine = createSyncEngine(
        fns,
        createMockNetwork(),
        undefined,
        mutex,
      );

      // Hold the mutex externally (simulating pullSync)
      const externalPromise = mutex.run(() => externalBlocks);

      // syncAll should be skipped
      await engine.syncAll();
      expect(fns.syncActivityIconDeletions).not.toHaveBeenCalled();

      // Release external lock
      resolveExternal!();
      await externalPromise;

      // Now syncAll should work
      await engine.syncAll();
      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(1);
    });
  });
});
