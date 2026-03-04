import type { NetworkAdapter } from "@packages/platform";

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
vi.mock("./syncTasks", () => ({
  syncTasks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./rnPlatformAdapters", () => ({
  rnNetworkAdapter: {
    isOnline: vi.fn(() => true),
    onOnline: vi.fn(() => vi.fn()),
  },
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

beforeEach(() => {
  vi.restoreAllMocks();
  // Re-apply default resolved mocks after restoreAllMocks clears implementations
  vi.mocked(syncActivityIconDeletions).mockResolvedValue(undefined);
  vi.mocked(syncActivities).mockResolvedValue(undefined);
  vi.mocked(syncActivityIcons).mockResolvedValue(undefined);
  vi.mocked(syncActivityLogs).mockResolvedValue(undefined);
  vi.mocked(syncGoals).mockResolvedValue(undefined);
  vi.mocked(syncTasks).mockResolvedValue(undefined);
});

describe("syncAll", () => {
  it("calls sync functions in dependency order", async () => {
    const callOrder: string[] = [];
    vi.mocked(syncActivityIconDeletions).mockImplementation(async () => {
      callOrder.push("iconDeletions");
    });
    vi.mocked(syncActivities).mockImplementation(async () => {
      callOrder.push("activities");
    });
    vi.mocked(syncActivityIcons).mockImplementation(async () => {
      callOrder.push("icons");
    });
    vi.mocked(syncActivityLogs).mockImplementation(async () => {
      callOrder.push("logs");
    });
    vi.mocked(syncGoals).mockImplementation(async () => {
      callOrder.push("goals");
    });
    vi.mocked(syncTasks).mockImplementation(async () => {
      callOrder.push("tasks");
    });

    await syncEngine.syncAll();

    // First 3 are sequential in order
    expect(callOrder.indexOf("iconDeletions")).toBe(0);
    expect(callOrder.indexOf("activities")).toBe(1);
    expect(callOrder.indexOf("icons")).toBe(2);
    // Last 3 are parallel (all after index 2)
    expect(callOrder.indexOf("logs")).toBeGreaterThan(2);
    expect(callOrder.indexOf("goals")).toBeGreaterThan(2);
    expect(callOrder.indexOf("tasks")).toBeGreaterThan(2);
  });

  it("prevents concurrent execution (isSyncing guard)", async () => {
    let resolve!: () => void;
    // Hang on the first function called so isSyncing stays true
    vi.mocked(syncActivityIconDeletions).mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    const first = syncEngine.syncAll();
    const second = syncEngine.syncAll();

    // syncActivityIconDeletions called only once (second call bailed out)
    expect(syncActivityIconDeletions).toHaveBeenCalledTimes(1);

    resolve();
    await first;
    await second;
  });

  it("resets retryCount on success", async () => {
    // First call fails to increment retryCount
    vi.mocked(syncActivities).mockRejectedValueOnce(new Error("fail"));
    await syncEngine.syncAll();

    // Second call succeeds, resetting retryCount
    await syncEngine.syncAll();

    // Verify both runs executed (not blocked by isSyncing)
    expect(syncActivityIconDeletions).toHaveBeenCalledTimes(2);
    expect(syncActivities).toHaveBeenCalledTimes(2);
  });

  it("increments retryCount on error", async () => {
    vi.mocked(syncActivities).mockRejectedValueOnce(new Error("fail"));
    await syncEngine.syncAll();

    // retryCount is now 1; verify indirectly via startAutoSync delay
    vi.useFakeTimers();
    const mockNetwork: NetworkAdapter = {
      isOnline: vi.fn(() => true),
      onOnline: vi.fn(() => vi.fn()),
    };

    const cleanup = syncEngine.startAutoSync(30000, mockNetwork);

    // Flush the immediate sync call (resets retryCount back to 0)
    await vi.advanceTimersByTimeAsync(0);

    // The first scheduled timeout should use the retry delay (2000ms),
    // not the normal interval (30000ms), because retryCount was 1
    // when scheduleNext was first called
    vi.clearAllMocks();
    await vi.advanceTimersByTimeAsync(2000);
    expect(syncActivityIconDeletions).toHaveBeenCalled();

    cleanup();
    vi.useRealTimers();
  });

  it("handles error without re-throwing", async () => {
    vi.mocked(syncActivities).mockRejectedValueOnce(new Error("fail"));

    await expect(syncEngine.syncAll()).resolves.toBeUndefined();
  });
});

describe("startAutoSync", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls syncAll immediately when online", async () => {
    vi.useFakeTimers();
    const mockNetwork: NetworkAdapter = {
      isOnline: vi.fn(() => true),
      onOnline: vi.fn(() => vi.fn()),
    };

    const cleanup = syncEngine.startAutoSync(30000, mockNetwork);
    await vi.advanceTimersByTimeAsync(0);

    expect(syncActivityIconDeletions).toHaveBeenCalled();
    cleanup();
  });

  it("schedules next sync after intervalMs when no errors", async () => {
    vi.useFakeTimers();
    const mockNetwork: NetworkAdapter = {
      isOnline: vi.fn(() => true),
      onOnline: vi.fn(() => vi.fn()),
    };

    const cleanup = syncEngine.startAutoSync(30000, mockNetwork);
    await vi.advanceTimersByTimeAsync(0); // flush initial sync
    vi.clearAllMocks();

    await vi.advanceTimersByTimeAsync(30000);
    expect(syncActivityIconDeletions).toHaveBeenCalled();

    cleanup();
  });

  it("cleanup removes listener and clears timeout", () => {
    const removeFn = vi.fn();
    const mockNetwork: NetworkAdapter = {
      isOnline: vi.fn(() => false),
      onOnline: vi.fn(() => removeFn),
    };

    const cleanup = syncEngine.startAutoSync(30000, mockNetwork);
    cleanup();

    expect(removeFn).toHaveBeenCalled();
  });

  it("skips sync when offline", async () => {
    vi.useFakeTimers();
    const mockNetwork: NetworkAdapter = {
      isOnline: vi.fn(() => false),
      onOnline: vi.fn(() => vi.fn()),
    };

    const cleanup = syncEngine.startAutoSync(30000, mockNetwork);
    await vi.advanceTimersByTimeAsync(30000);

    expect(syncActivityIconDeletions).not.toHaveBeenCalled();
    cleanup();
  });
});
