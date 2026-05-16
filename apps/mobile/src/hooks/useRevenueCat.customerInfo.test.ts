import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any import
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  apiGetMe: vi.fn(),
  runAsync: vi.fn(),
  getDatabase: vi.fn(),
  dbEventsEmit: vi.fn(),
}));

vi.mock("react-native-purchases", () => ({
  default: {
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
    getOfferings: vi.fn(),
    addCustomerInfoUpdateListener: vi.fn(),
    removeCustomerInfoUpdateListener: vi.fn(),
  },
}));

vi.mock("../lib/revenueCat", () => ({ initRevenueCat: vi.fn() }));
vi.mock("../utils/authApi", () => ({ apiGetMe: mocks.apiGetMe }));
vi.mock("../db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../db/dbEvents", () => ({
  dbEvents: {
    emit: mocks.dbEventsEmit,
    subscribe: vi.fn(() => () => {}),
  },
}));
vi.mock("../contexts/AuthContext", () => ({ useAuthContext: vi.fn() }));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { handleCustomerInfoUpdate } from "./useRevenueCat";

function makeDb() {
  const db = { runAsync: mocks.runAsync };
  mocks.getDatabase.mockResolvedValue(db);
  return db;
}

function makeInfo(hasPremium: boolean) {
  return {
    entitlements: {
      active: hasPremium ? { premium: {} } : {},
    },
  } as never;
}

describe("CustomerInfo handler — plan refresh deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeDb();
  });

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

    handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledOnce();
    });
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
    await vi.waitFor(() => {
      expect(lastActiveRef.current).toBeNull();
    });
    expect(mocks.apiGetMe).toHaveBeenCalledOnce();

    mocks.apiGetMe.mockResolvedValueOnce({ plan: "premium" });
    const triggered = handleCustomerInfoUpdate(makeInfo(true), lastActiveRef);
    expect(triggered).toBe(true);
    await vi.waitFor(() => {
      expect(mocks.apiGetMe).toHaveBeenCalledTimes(2);
    });
  });
});
