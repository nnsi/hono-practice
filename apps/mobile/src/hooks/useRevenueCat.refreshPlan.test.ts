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

// refreshPlanFromBackend のみが対象なので react-native-purchases も
// 念のため stub する。
vi.mock("react-native-purchases", () => ({
  default: {
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
    getOfferings: vi.fn(),
    addCustomerInfoUpdateListener: vi.fn(),
    removeCustomerInfoUpdateListener: vi.fn(),
  },
}));

vi.mock("../lib/revenueCat", () => ({
  initRevenueCat: vi.fn(),
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
  useAuthContext: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { refreshPlanFromBackend } from "./useRevenueCat";

function makeDb() {
  const db = { runAsync: mocks.runAsync };
  mocks.getDatabase.mockResolvedValue(db);
  return db;
}

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

  it("emits dbEvents('auth_state') after writing the plan", async () => {
    // usePlan は dbEvents("auth_state") を購読しているので、ここで emit
    // しないと SubscriptionSection / UpgradeScreen が同一画面に留まったとき
    // に再レンダリングされない (UI 即時反映の要)。
    mocks.apiGetMe.mockResolvedValue({ plan: "premium" });
    await refreshPlanFromBackend();
    expect(mocks.dbEventsEmit).toHaveBeenCalledWith("auth_state");
    // emit は DB 書き込みのあとに呼ばれることも担保しておく
    const updateOrder = mocks.runAsync.mock.invocationCallOrder[0];
    const emitOrder = mocks.dbEventsEmit.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(emitOrder);
  });
});
