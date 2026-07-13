import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiGetMe: vi.fn(),
  runAsync: vi.fn(),
  getDatabase: vi.fn(),
  dbEventsEmit: vi.fn(),
  reloadWidgetTimelines: vi.fn(),
}));

vi.mock("../utils/authApi", () => ({ apiGetMe: mocks.apiGetMe }));
vi.mock("../db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../db/dbEvents", () => ({
  dbEvents: { emit: mocks.dbEventsEmit },
}));
vi.mock("../lib/widgetTimeline", () => ({
  reloadWidgetTimelines: mocks.reloadWidgetTimelines,
}));

import { reconcilePlanFromBackend } from "./planReconciliation";

describe("reconcilePlanFromBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockResolvedValue({ runAsync: mocks.runAsync });
  });

  it("retries successful responses containing the old plan until webhook state arrives", async () => {
    mocks.apiGetMe
      .mockResolvedValueOnce({ plan: "free" })
      .mockResolvedValueOnce({ plan: "free" })
      .mockResolvedValueOnce({ plan: "premium" });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const reconciled = await reconcilePlanFromBackend("premium", {
      maxAttempts: 4,
      initialDelayMs: 10,
      sleep,
    });

    expect(reconciled).toBe(true);
    expect(mocks.apiGetMe).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
    expect(mocks.runAsync).toHaveBeenLastCalledWith(
      "UPDATE auth_state SET plan = ? WHERE id = 'current'",
      ["premium"],
    );
    expect(mocks.reloadWidgetTimelines).toHaveBeenCalledTimes(3);
  });

  it("is bounded when the backend never reaches the expected plan", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "free" });

    const reconciled = await reconcilePlanFromBackend("premium", {
      maxAttempts: 3,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(reconciled).toBe(false);
    expect(mocks.apiGetMe).toHaveBeenCalledTimes(3);
  });
});
