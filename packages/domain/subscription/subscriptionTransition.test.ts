import { describe, expect, it } from "vitest";

import { isAllowedSubscriptionTransition } from "./subscriptionSchema";

describe("subscription transition policy", () => {
  it("allows a delayed renewal to recover an expired entitlement", () => {
    expect(isAllowedSubscriptionTransition("expired", "active")).toBe(true);
  });

  it("allows an explicit revoke from active", () => {
    expect(isAllowedSubscriptionTransition("active", "cancelled")).toBe(true);
  });

  it("does not move an active entitlement backwards into a trial", () => {
    expect(isAllowedSubscriptionTransition("active", "trial")).toBe(false);
  });
});
