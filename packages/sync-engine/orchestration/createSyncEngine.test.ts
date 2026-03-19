import type { NetworkAdapter } from "@packages/platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSyncEngine } from "./createSyncEngine";

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

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      // iconDeletions -> activities -> activityIcons must be in order
      const iconDelIdx = callOrder.indexOf("iconDeletions");
      const activitiesIdx = callOrder.indexOf("activities");
      const activityIconsIdx = callOrder.indexOf("activityIcons");

      expect(iconDelIdx).toBeLessThan(activitiesIdx);
      expect(activitiesIdx).toBeLessThan(activityIconsIdx);

      // activityLogs, goals, tasks are called after activityIcons
      expect(callOrder.indexOf("activityLogs")).toBeGreaterThan(
        activityIconsIdx,
      );
      expect(callOrder.indexOf("goals")).toBeGreaterThan(activityIconsIdx);
      expect(callOrder.indexOf("tasks")).toBeGreaterThan(activityIconsIdx);
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

    it("increments retryCount on error", async () => {
      const fns = createMockFns();
      fns.syncActivityIconDeletions.mockRejectedValueOnce(
        new Error("network error"),
      );

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      fns.syncActivityIconDeletions.mockResolvedValue(undefined);
      await engine.syncAll();

      expect(fns.syncActivityIconDeletions).toHaveBeenCalledTimes(2);
    });

    it("does not call later sync functions if earlier ones throw", async () => {
      const fns = createMockFns();
      fns.syncActivities.mockRejectedValueOnce(new Error("fail"));

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      expect(fns.syncActivityIcons).not.toHaveBeenCalled();
      expect(fns.syncActivityLogs).not.toHaveBeenCalled();
      expect(fns.syncGoals).not.toHaveBeenCalled();
      expect(fns.syncTasks).not.toHaveBeenCalled();
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

    it("resets retryCount on success", async () => {
      const fns = createMockFns();
      fns.syncActivityIconDeletions.mockRejectedValueOnce(new Error("fail"));

      const engine = createSyncEngine(fns, createMockNetwork());
      await engine.syncAll();

      fns.syncActivityIconDeletions.mockResolvedValue(undefined);
      await engine.syncAll();

      expect(fns.syncActivities).toHaveBeenCalledTimes(1);
      expect(fns.syncActivityLogs).toHaveBeenCalledTimes(1);
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
});
