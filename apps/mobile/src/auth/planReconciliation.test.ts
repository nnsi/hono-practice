import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiGetMe: vi.fn(),
  setPlan: vi.fn(),
  createMobileAuthStateRepository: vi.fn(),
  reloadWidgetTimelines: vi.fn(),
}));

vi.mock("../utils/authApi", () => ({ apiGetMe: mocks.apiGetMe }));
vi.mock("./mobileAuthStateRepository", () => ({
  createMobileAuthStateRepository: mocks.createMobileAuthStateRepository,
}));
vi.mock("../lib/widgetTimeline", () => ({
  reloadWidgetTimelines: mocks.reloadWidgetTimelines,
}));

import { reconcilePlanFromBackend } from "./planReconciliation";

describe("reconcilePlanFromBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMobileAuthStateRepository.mockReturnValue({
      setPlan: mocks.setPlan,
    });
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
    expect(mocks.setPlan).toHaveBeenLastCalledWith("premium");
    expect(mocks.reloadWidgetTimelines).toHaveBeenCalledTimes(3);
  });

  it("persists through an injected repository and uses the injected timeline notifier", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });
    const setPlan = vi.fn().mockResolvedValue(undefined);
    const notifyWidgetTimelines = vi.fn();

    const reconciled = await reconcilePlanFromBackend("premium", {
      authStateRepository: { setPlan },
      notifyWidgetTimelines,
    });

    expect(reconciled).toBe(true);
    expect(setPlan).toHaveBeenCalledOnce();
    expect(setPlan).toHaveBeenCalledWith("premium");
    expect(notifyWidgetTimelines).toHaveBeenCalledOnce();
    expect(mocks.createMobileAuthStateRepository).not.toHaveBeenCalled();
    expect(mocks.reloadWidgetTimelines).not.toHaveBeenCalled();
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
