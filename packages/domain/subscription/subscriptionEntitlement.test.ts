import { describe, expect, it } from "vitest";

import {
  getEffectiveSubscriptionPlan,
  isSubscriptionActive,
  isSubscriptionPremium,
} from "./subscriptionSchema";

const NOW = new Date("2026-07-13T12:00:00.000Z");

describe("effective subscription entitlement", () => {
  it.each([
    { label: "null", currentPeriodEnd: null },
    {
      label: "past",
      currentPeriodEnd: new Date("2026-07-13T11:59:59.999Z"),
    },
    { label: "equal", currentPeriodEnd: NOW },
  ])("treats active premium with $label period end as free", ({
    currentPeriodEnd,
  }) => {
    const subscription = {
      plan: "premium" as const,
      status: "active" as const,
      currentPeriodEnd,
      trialEnd: null,
    };

    expect(isSubscriptionActive(subscription, NOW)).toBe(false);
    expect(isSubscriptionPremium(subscription, NOW)).toBe(false);
    expect(getEffectiveSubscriptionPlan(subscription, NOW)).toBe("free");
  });

  it("treats active premium with a future period end as premium", () => {
    const subscription = {
      plan: "premium" as const,
      status: "active" as const,
      currentPeriodEnd: new Date("2026-07-13T12:00:00.001Z"),
      trialEnd: null,
    };

    expect(isSubscriptionActive(subscription, NOW)).toBe(true);
    expect(isSubscriptionPremium(subscription, NOW)).toBe(true);
    expect(getEffectiveSubscriptionPlan(subscription, NOW)).toBe("premium");
  });

  it("uses trialEnd as the exclusive boundary for premium trials", () => {
    expect(
      getEffectiveSubscriptionPlan(
        {
          plan: "premium",
          status: "trial",
          currentPeriodEnd: null,
          trialEnd: NOW,
        },
        NOW,
      ),
    ).toBe("free");
    expect(
      getEffectiveSubscriptionPlan(
        {
          plan: "premium",
          status: "trial",
          currentPeriodEnd: null,
          trialEnd: new Date(NOW.getTime() + 1),
        },
        NOW,
      ),
    ).toBe("premium");
  });
});
