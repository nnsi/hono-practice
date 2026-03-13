import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./syncActivities", () => ({
  syncActivities: vi.fn().mockResolvedValue(undefined),
  syncActivityIconDeletions: vi.fn().mockResolvedValue(undefined),
  syncActivityIcons: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./syncActivityLogs", () => ({
  syncActivityLogs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./syncGoals", () => ({
  syncGoals: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./syncGoalFreezePeriods", () => ({
  syncGoalFreezePeriods: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./syncTasks", () => ({
  syncTasks: vi.fn().mockResolvedValue(undefined),
}));

import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";
import { syncActivityLogs } from "./syncActivityLogs";
import { syncEngine } from "./syncEngine";
import { syncGoals } from "./syncGoals";
import { syncTasks } from "./syncTasks";

const mockSyncActivities = vi.mocked(syncActivities);
const mockSyncActivityIconDeletions = vi.mocked(syncActivityIconDeletions);
const mockSyncActivityIcons = vi.mocked(syncActivityIcons);
const mockSyncActivityLogs = vi.mocked(syncActivityLogs);
const mockSyncGoals = vi.mocked(syncGoals);
const mockSyncTasks = vi.mocked(syncTasks);

describe("syncEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("syncAll", () => {
    it("calls sync functions in correct order", async () => {
      const callOrder: string[] = [];

      mockSyncActivityIconDeletions.mockImplementation(async () => {
        callOrder.push("iconDeletions");
      });
      mockSyncActivities.mockImplementation(async () => {
        callOrder.push("activities");
      });
      mockSyncActivityIcons.mockImplementation(async () => {
        callOrder.push("activityIcons");
      });
      mockSyncActivityLogs.mockImplementation(async () => {
        callOrder.push("activityLogs");
      });
      mockSyncGoals.mockImplementation(async () => {
        callOrder.push("goals");
      });
      mockSyncTasks.mockImplementation(async () => {
        callOrder.push("tasks");
      });

      await syncEngine.syncAll();

      // iconDeletions -> activities -> activityIcons must be in order
      const iconDelIdx = callOrder.indexOf("iconDeletions");
      const activitiesIdx = callOrder.indexOf("activities");
      const activityIconsIdx = callOrder.indexOf("activityIcons");

      expect(iconDelIdx).toBeLessThan(activitiesIdx);
      expect(activitiesIdx).toBeLessThan(activityIconsIdx);

      // activityLogs, goals, tasks are called after activityIcons (via Promise.all)
      expect(callOrder.indexOf("activityLogs")).toBeGreaterThan(
        activityIconsIdx,
      );
      expect(callOrder.indexOf("goals")).toBeGreaterThan(activityIconsIdx);
      expect(callOrder.indexOf("tasks")).toBeGreaterThan(activityIconsIdx);
    });

    it("prevents concurrent execution (mutex)", async () => {
      let resolveFirst: () => void;
      const firstBlocks = new Promise<void>((r) => {
        resolveFirst = r;
      });

      mockSyncActivityIconDeletions.mockImplementation(() => firstBlocks);

      // Start first sync (will block on iconDeletions)
      const first = syncEngine.syncAll();
      // Start second sync while first is still running
      const second = syncEngine.syncAll();

      // Second should return immediately (noop)
      await second;

      // First call has iconDeletions in progress
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(1);

      // Let first complete
      resolveFirst!();
      await first;

      // Still only called once (second was skipped)
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(1);
    });

    it("increments retryCount on error", async () => {
      mockSyncActivityIconDeletions.mockRejectedValueOnce(
        new Error("network error"),
      );

      await syncEngine.syncAll();

      // After error, next syncAll should work
      mockSyncActivityIconDeletions.mockResolvedValue(undefined);
      await syncEngine.syncAll();

      // Both calls executed (mutex was released after first failed)
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(2);
    });

    it("does not call later sync functions if earlier ones throw", async () => {
      mockSyncActivityIconDeletions.mockResolvedValue(undefined);
      mockSyncActivities.mockRejectedValueOnce(new Error("fail"));

      await syncEngine.syncAll();

      expect(mockSyncActivityIcons).not.toHaveBeenCalled();
      expect(mockSyncActivityLogs).not.toHaveBeenCalled();
      expect(mockSyncGoals).not.toHaveBeenCalled();
      expect(mockSyncTasks).not.toHaveBeenCalled();
    });

    it("partial failure in Promise.all does not break mutex", async () => {
      mockSyncGoals.mockRejectedValueOnce(new Error("goals failed"));

      await syncEngine.syncAll();

      mockSyncGoals.mockResolvedValue(undefined);
      await syncEngine.syncAll();

      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(2);
    });

    it("resets retryCount on success", async () => {
      // First call fails
      mockSyncActivityIconDeletions.mockRejectedValueOnce(new Error("fail"));
      await syncEngine.syncAll();

      // Second call succeeds - retryCount resets
      mockSyncActivityIconDeletions.mockResolvedValue(undefined);
      await syncEngine.syncAll();

      // Verify all sync functions were called on second attempt
      expect(mockSyncActivities).toHaveBeenCalledTimes(1);
      expect(mockSyncActivityLogs).toHaveBeenCalledTimes(1);
    });
  });

  describe("startAutoSync", () => {
    it("returns cleanup function", () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });

      const cleanup = syncEngine.startAutoSync(60000);

      expect(typeof cleanup).toBe("function");
      cleanup();
    });

    it("adds online event listener", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });

      const cleanup = syncEngine.startAutoSync(60000);

      expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));

      // addEventListener と removeEventListener に同一の関数参照が渡されることを検証
      const addedHandler = addSpy.mock.calls.find(
        (c) => c[0] === "online",
      )?.[1];

      cleanup();

      const removedHandler = removeSpy.mock.calls.find(
        (c) => c[0] === "online",
      )?.[1];
      expect(removedHandler).toBe(addedHandler);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("performs immediate sync when online", async () => {
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });

      const cleanup = syncEngine.startAutoSync(60000);

      // Let microtasks resolve
      await vi.advanceTimersByTimeAsync(0);

      expect(mockSyncActivityIconDeletions).toHaveBeenCalled();

      cleanup();
    });

    it("does not perform immediate sync when offline", async () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });

      const cleanup = syncEngine.startAutoSync(60000);

      await vi.advanceTimersByTimeAsync(0);

      expect(mockSyncActivityIconDeletions).not.toHaveBeenCalled();

      cleanup();
    });

    it("triggers syncAll via NetworkAdapter when going online", async () => {
      let onlineCallback: (() => void) | null = null;
      const mockNetwork = {
        isOnline: vi.fn().mockReturnValue(false),
        onOnline: vi.fn((cb: () => void) => {
          onlineCallback = cb;
          return () => {
            onlineCallback = null;
          };
        }),
      };

      const cleanup = syncEngine.startAutoSync(60000, mockNetwork);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockSyncActivityIconDeletions).not.toHaveBeenCalled();

      mockNetwork.isOnline.mockReturnValue(true);
      onlineCallback!();
      await vi.advanceTimersByTimeAsync(0);

      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(1);
      expect(mockSyncActivities).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("first scheduled timeout uses intervalMs, not backoff", async () => {
      const mockNetwork = {
        isOnline: vi.fn().mockReturnValue(true),
        onOnline: vi.fn(() => () => {}),
      };

      mockSyncActivityIconDeletions.mockRejectedValueOnce(
        new Error("network error"),
      );

      const cleanup = syncEngine.startAutoSync(30000, mockNetwork);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(29999);
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(mockSyncActivityIconDeletions).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it("does not sync on timer tick when offline (NetworkAdapter)", async () => {
      const mockNetwork = {
        isOnline: vi.fn().mockReturnValue(false),
        onOnline: vi.fn(() => () => {}),
      };

      const cleanup = syncEngine.startAutoSync(30000, mockNetwork);
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(30000);
      expect(mockSyncActivityIconDeletions).not.toHaveBeenCalled();

      cleanup();
    });
  });
});
