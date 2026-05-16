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

  // ../db/dbEvents
  dbEventsEmit: vi.fn(),

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

vi.mock("../db/dbEvents", () => ({
  dbEvents: {
    emit: mocks.dbEventsEmit,
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: mocks.useAuthContext,
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { executePurchase, executeRestore } from "./useRevenueCat";

function makeDb() {
  const db = { runAsync: mocks.runAsync };
  mocks.getDatabase.mockResolvedValue(db);
  return db;
}

// refreshPlanFromBackend の単体テストは useRevenueCat.refreshPlan.test.ts に
// 分割している（200 行制限に収めるため）。

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

// handleCustomerInfoUpdate と refreshPlanFromBackend のテストは
// 200 行制限のため別ファイルに切り出している:
// - useRevenueCat.customerInfo.test.ts
// - useRevenueCat.refreshPlan.test.ts
