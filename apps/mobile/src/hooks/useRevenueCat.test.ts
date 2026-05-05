import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any import
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  // react-native-purchases
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
  getOfferings: vi.fn(),
  addCustomerInfoUpdateListener: vi.fn(),
  removeCustomerInfoUpdateListener: vi.fn(),

  // ../lib/revenueCat
  initRevenueCat: vi.fn(),

  // ../utils/authApi
  apiGetMe: vi.fn(),

  // ../db/database
  runAsync: vi.fn(),
  getDatabase: vi.fn(),

  // ../contexts/AuthContext
  useAuthContext: vi.fn(),
}));

vi.mock("react-native-purchases", () => ({
  default: {
    purchasePackage: mocks.purchasePackage,
    restorePurchases: mocks.restorePurchases,
    getOfferings: mocks.getOfferings,
    addCustomerInfoUpdateListener: mocks.addCustomerInfoUpdateListener,
    removeCustomerInfoUpdateListener: mocks.removeCustomerInfoUpdateListener,
  },
}));

vi.mock("../lib/revenueCat", () => ({
  initRevenueCat: mocks.initRevenueCat,
}));

vi.mock("../utils/authApi", () => ({
  apiGetMe: mocks.apiGetMe,
}));

vi.mock("../db/database", () => ({
  getDatabase: mocks.getDatabase,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: mocks.useAuthContext,
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import {
  executePurchase,
  executeRestore,
  handleCustomerInfoUpdate,
  refreshPlanFromBackend,
} from "./useRevenueCat";

function makeDb() {
  const db = { runAsync: mocks.runAsync };
  mocks.getDatabase.mockResolvedValue(db);
  return db;
}

// ---------------------------------------------------------------------------
// Tests: refreshPlanFromBackend
// ---------------------------------------------------------------------------

describe("refreshPlanFromBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeDb();
  });

  it("writes apiGetMe.plan to auth_state.plan", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });
    await refreshPlanFromBackend();
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();
    expect(mocks.runAsync).toHaveBeenCalledWith(
      "UPDATE auth_state SET plan = ? WHERE id = 'current'",
      ["premium"],
    );
  });

  it("falls back to 'free' when apiGetMe returns no plan", async () => {
    mocks.apiGetMe.mockResolvedValue({});
    await refreshPlanFromBackend();
    expect(mocks.runAsync).toHaveBeenCalledWith(
      "UPDATE auth_state SET plan = ? WHERE id = 'current'",
      ["free"],
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: executePurchase
// ---------------------------------------------------------------------------

describe("executePurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeDb();
  });

  it("returns ok=true and refreshes plan on successful purchase", async () => {
    mocks.purchasePackage.mockResolvedValue({});
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });

    const result = await executePurchase({
      identifier: "premium_monthly",
    } as never);

    expect(result).toEqual({ ok: true, userCancelled: false });
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();
  });

  it("returns ok=false userCancelled=true when user cancels", async () => {
    mocks.purchasePackage.mockRejectedValue({ userCancelled: true });

    const result = await executePurchase({ identifier: "pkg" } as never);

    expect(result).toEqual({ ok: false, userCancelled: true });
    expect(mocks.apiGetMe).not.toHaveBeenCalled();
  });

  it("returns ok=false userCancelled=false on generic failure", async () => {
    mocks.purchasePackage.mockRejectedValue(new Error("payment failed"));

    const result = await executePurchase({ identifier: "pkg" } as never);

    expect(result).toEqual({ ok: false, userCancelled: false });
    expect(mocks.apiGetMe).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: executeRestore
// ---------------------------------------------------------------------------

describe("executeRestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeDb();
  });

  it("returns true and refreshes plan after successful restore", async () => {
    mocks.restorePurchases.mockResolvedValue({});
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });

    const result = await executeRestore();

    expect(result).toBe(true);
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();
    expect(mocks.runAsync).toHaveBeenCalledWith(
      "UPDATE auth_state SET plan = ? WHERE id = 'current'",
      ["premium"],
    );
  });

  it("returns false and does not call apiGetMe on restore failure", async () => {
    mocks.restorePurchases.mockRejectedValue(new Error("restore failed"));

    const result = await executeRestore();

    expect(result).toBe(false);
    expect(mocks.apiGetMe).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: CustomerInfo handler logic (unit test of handler logic)
// ---------------------------------------------------------------------------

describe("CustomerInfo handler — plan refresh deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeDb();
  });

  function makeInfo(hasPremium: boolean) {
    return {
      entitlements: {
        active: hasPremium ? { premium: {} } : {},
      },
    } as never;
  }

  it("calls refreshPlanFromBackend when entitlement changes from absent to active", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });
    const lastActiveRef = { current: null as boolean | null };

    const triggered = handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    expect(triggered).toBe(true);

    await vi.waitFor(() => {
      expect(mocks.runAsync).toHaveBeenCalledWith(
        "UPDATE auth_state SET plan = ? WHERE id = 'current'",
        ["premium"],
      );
    });
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();
  });

  it("skips duplicate calls when entitlement state does not change", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });
    const lastActiveRef = { current: null as boolean | null };

    // First call — should fire
    handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledOnce();
    });
    // Second call with same state — should be deduplicated
    const triggered = handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);

    expect(triggered).toBe(false);
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();
  });

  it("fires again when entitlement transitions from active to inactive", async () => {
    mocks.apiGetMe.mockResolvedValue({ plan: "free" });
    const lastActiveRef = { current: null as boolean | null };

    handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledOnce();
    });
    handleCustomerInfoUpdate(makeInfo(false), lastActiveRef);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledTimes(2);
    });
  });

  it("rolls back lastActiveRef on refresh failure to allow retry", async () => {
    mocks.apiGetMe.mockRejectedValueOnce(new Error("network"));
    const lastActiveRef = { current: null as boolean | null };

    handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    // Wait for the rollback (which fires after apiGetMe rejects in the catch handler)
    await vi.waitFor(() => {
      expect(lastActiveRef.current).toBeNull();
    });
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();

    // Same event should re-trigger refresh since ref was rolled back
    mocks.apiGetMe.mockResolvedValueOnce({ plan: "premium" });
    const triggered = handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    expect(triggered).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledTimes(2);
    });
  });
});
