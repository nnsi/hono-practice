import { beforeEach, describe, expect, it, vi } from "vitest";

type HookName = "creating" | "updating";

type MockDb = {
  authState: {
    get: ReturnType<typeof vi.fn>;
    hook: ReturnType<typeof vi.fn>;
  };
  events: Record<
    HookName,
    {
      unsubscribe: ReturnType<typeof vi.fn>;
    }
  >;
};

let mockDb: MockDb;

vi.mock("../db/schema", () => ({
  get db() {
    return mockDb;
  },
}));

function createMockDb(userId = "user-1"): MockDb {
  const events = {
    creating: { unsubscribe: vi.fn() },
    updating: { unsubscribe: vi.fn() },
  };

  return {
    authState: {
      get: vi.fn().mockResolvedValue({
        userId,
        lastLoginAt: "2026-04-11T00:00:00.000Z",
      }),
      hook: vi.fn((eventName: HookName) => events[eventName]),
    },
    events,
  };
}

describe("web errorReporter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/settings");
    delete (
      globalThis as typeof globalThis & {
        __actikoWebErrorReporterState__?: unknown;
      }
    ).__actikoWebErrorReporterState__;
    mockDb = createMockDb();
  });

  it("initializes auth tracking lazily and only once per db instance", async () => {
    const { webReportErrorOptions } = await import("./errorReporter");

    expect(mockDb.authState.get).not.toHaveBeenCalled();
    expect(mockDb.authState.hook).not.toHaveBeenCalled();

    expect(webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: undefined,
    });
    expect(mockDb.authState.get).toHaveBeenCalledWith("current");
    expect(mockDb.authState.hook).toHaveBeenCalledWith(
      "creating",
      expect.any(Function),
    );
    expect(mockDb.authState.hook).toHaveBeenCalledWith(
      "updating",
      expect.any(Function),
    );
    expect(mockDb.authState.hook).toHaveBeenCalledTimes(2);

    await Promise.resolve();

    expect(webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: "user-1",
    });
    expect(mockDb.authState.get).toHaveBeenCalledTimes(1);
    expect(mockDb.authState.hook).toHaveBeenCalledTimes(2);

    webReportErrorOptions.getContext?.();
    expect(mockDb.authState.get).toHaveBeenCalledTimes(1);
    expect(mockDb.authState.hook).toHaveBeenCalledTimes(2);
  });

  it("detaches old hooks and re-registers when the db module is reloaded", async () => {
    const firstDb = createMockDb("user-1");
    mockDb = firstDb;
    const firstModule = await import("./errorReporter");

    firstModule.webReportErrorOptions.getContext?.();
    await Promise.resolve();

    expect(firstDb.authState.hook).toHaveBeenCalledTimes(2);
    expect(firstModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: "user-1",
    });

    const firstCreatingHook = firstDb.authState.hook.mock.calls[0]?.[1];
    const firstUpdatingHook = firstDb.authState.hook.mock.calls[1]?.[1];

    vi.resetModules();
    const secondDb = createMockDb("user-2");
    mockDb = secondDb;
    const secondModule = await import("./errorReporter");

    expect(secondModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: undefined,
    });
    expect(secondDb.authState.get).toHaveBeenCalledWith("current");
    expect(secondDb.authState.hook).toHaveBeenCalledWith(
      "creating",
      expect.any(Function),
    );
    expect(secondDb.authState.hook).toHaveBeenCalledWith(
      "updating",
      expect.any(Function),
    );

    expect(firstDb.events.creating.unsubscribe).toHaveBeenCalledWith(
      firstCreatingHook,
    );
    expect(firstDb.events.updating.unsubscribe).toHaveBeenCalledWith(
      firstUpdatingHook,
    );

    await Promise.resolve();

    expect(secondModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: "user-2",
    });
  });

  it("ignores stale auth reads from a previous db instance", async () => {
    let resolveFirstRead!: (value: {
      userId: string;
      lastLoginAt: string;
    }) => void;
    const firstDb = createMockDb("user-1");
    firstDb.authState.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirstRead = resolve;
        }),
    );
    mockDb = firstDb;
    const firstModule = await import("./errorReporter");

    expect(firstModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: undefined,
    });

    vi.resetModules();
    const secondDb = createMockDb("user-2");
    mockDb = secondDb;
    const secondModule = await import("./errorReporter");

    expect(secondModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: undefined,
    });

    await Promise.resolve();

    expect(secondModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: "user-2",
    });

    resolveFirstRead({
      userId: "user-1",
      lastLoginAt: "2026-04-11T00:00:00.000Z",
    });
    await Promise.resolve();

    expect(secondModule.webReportErrorOptions.getContext?.()).toEqual({
      screen: "/settings",
      userId: "user-2",
    });
  });
});
