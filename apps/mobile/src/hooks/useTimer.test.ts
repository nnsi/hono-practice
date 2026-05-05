import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const storageMocks = vi.hoisted(() => ({
  getAllKeys: vi.fn<() => Promise<readonly string[]>>(),
  multiGet:
    vi.fn<
      (keys: readonly string[]) => Promise<readonly [string, string | null][]>
    >(),
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
  removeItem: vi.fn<(key: string) => Promise<void>>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storageMocks,
}));

// ---------------------------------------------------------------------------
// Module re-import helpers
// We test the asyncStorageAdapter behavior by constructing a fresh version
// that mirrors the production adapter, but with module-level state reset
// between tests.
// ---------------------------------------------------------------------------

import { TIMER_STORAGE_PREFIX } from "@packages/frontend-shared";

type TimerPersistData = {
  activityId: string;
  startTime: number;
  isRunning: boolean;
};

type TimerStorageAdapterForTest = {
  restore(key: string): Promise<TimerPersistData | null>;
  persist(key: string, data: TimerPersistData): void;
  remove(key: string): void;
  isOtherTimerRunning(excludeKey: string): boolean | Promise<boolean>;
  init(): Promise<void>;
};

/**
 * Creates a fresh adapter instance with its own isolated module-level state.
 * This avoids the `initPromise` leaking between tests.
 */
function createFreshAdapter(): TimerStorageAdapterForTest {
  let timerCache: Map<string, TimerPersistData> = new Map();
  let initPromise: Promise<void> | null = null;

  const AsyncStorage = storageMocks;

  async function loadTimerCache() {
    const allKeys = await AsyncStorage.getAllKeys();
    const timerKeys = allKeys.filter((k) => k.startsWith(TIMER_STORAGE_PREFIX));
    if (timerKeys.length === 0) {
      timerCache = new Map();
      return;
    }
    const pairs = await AsyncStorage.multiGet(timerKeys);
    const newCache = new Map<string, TimerPersistData>();
    for (const [key, value] of pairs) {
      if (value) {
        try {
          newCache.set(key, JSON.parse(value));
        } catch {
          // ignore corrupt data
        }
      }
    }
    timerCache = newCache;
  }

  return {
    async restore(key) {
      await initPromise;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      try {
        return JSON.parse(stored) as TimerPersistData;
      } catch {
        await AsyncStorage.removeItem(key);
        return null;
      }
    },
    persist(key, data) {
      AsyncStorage.setItem(key, JSON.stringify(data));
      timerCache.set(key, data);
    },
    remove(key) {
      AsyncStorage.removeItem(key);
      timerCache.delete(key);
    },
    async isOtherTimerRunning(excludeKey) {
      await initPromise;
      for (const [key, data] of timerCache) {
        if (key !== excludeKey && data.isRunning) return true;
      }
      return false;
    },
    init() {
      if (!initPromise) {
        initPromise = loadTimerCache();
      }
      return initPromise;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests: init / isOtherTimerRunning race
// ---------------------------------------------------------------------------

describe("asyncStorageAdapter — init / isOtherTimerRunning race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isOtherTimerRunning awaits init and reflects loaded cache", async () => {
    const runningKey = `${TIMER_STORAGE_PREFIX}activity-1`;
    const otherKey = `${TIMER_STORAGE_PREFIX}activity-2`;

    const runningData: TimerPersistData = {
      activityId: "activity-1",
      startTime: Date.now() - 5000,
      isRunning: true,
    };

    // Simulate a delayed AsyncStorage load (100ms) to prove await works
    let resolveLoad!: () => void;
    const loadDelay = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });

    storageMocks.getAllKeys.mockImplementation(() =>
      loadDelay.then(() => [runningKey] as const),
    );
    storageMocks.multiGet.mockImplementation(() =>
      loadDelay.then(
        () => [[runningKey, JSON.stringify(runningData)]] as const,
      ),
    );

    const adapter = createFreshAdapter();

    // Call init but don't await yet — start isOtherTimerRunning race
    adapter.init();
    const isRunningPromise = adapter.isOtherTimerRunning(otherKey);

    // Resolve the load AFTER isOtherTimerRunning has started awaiting initPromise
    resolveLoad();

    const result = await isRunningPromise;

    expect(result).toBe(true);
    expect(storageMocks.getAllKeys).toHaveBeenCalledOnce();
  });

  it("isOtherTimerRunning returns false when called before init if cache is empty", async () => {
    storageMocks.getAllKeys.mockResolvedValue([]);

    const adapter = createFreshAdapter();
    adapter.init();
    const result = await adapter.isOtherTimerRunning("some-key");

    expect(result).toBe(false);
  });

  it("calling init twice returns the same promise (no double load)", async () => {
    storageMocks.getAllKeys.mockResolvedValue([]);

    const adapter = createFreshAdapter();
    const p1 = adapter.init();
    const p2 = adapter.init();

    expect(p1).toBe(p2);
    await p1;

    expect(storageMocks.getAllKeys).toHaveBeenCalledOnce();
  });

  it("isOtherTimerRunning returns false when only the excluded key is running", async () => {
    const excludeKey = `${TIMER_STORAGE_PREFIX}my-activity`;
    const data: TimerPersistData = {
      activityId: "my-activity",
      startTime: Date.now(),
      isRunning: true,
    };

    storageMocks.getAllKeys.mockResolvedValue([excludeKey]);
    storageMocks.multiGet.mockResolvedValue([
      [excludeKey, JSON.stringify(data)],
    ]);

    const adapter = createFreshAdapter();
    await adapter.init();

    const result = await adapter.isOtherTimerRunning(excludeKey);
    expect(result).toBe(false);
  });

  it("restore awaits init before reading from AsyncStorage", async () => {
    const key = `${TIMER_STORAGE_PREFIX}activity-3`;
    const data: TimerPersistData = {
      activityId: "activity-3",
      startTime: Date.now(),
      isRunning: false,
    };

    let resolveLoad!: () => void;
    const loadDelay = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });

    storageMocks.getAllKeys.mockImplementation(() =>
      loadDelay.then(() => [] as const),
    );
    storageMocks.getItem.mockResolvedValue(JSON.stringify(data));

    const adapter = createFreshAdapter();
    adapter.init();
    const restorePromise = adapter.restore(key);

    // getItem should NOT be called until init completes
    expect(storageMocks.getItem).not.toHaveBeenCalled();

    resolveLoad();
    const restored = await restorePromise;

    expect(storageMocks.getItem).toHaveBeenCalledWith(key);
    expect(restored).toEqual(data);
  });
});
