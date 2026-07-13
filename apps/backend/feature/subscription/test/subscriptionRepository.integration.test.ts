import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { noopTracer } from "@backend/lib/tracer";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { createUserId } from "@packages/domain/user/userSchema";
import { beforeEach, describe, expect, it } from "vitest";

import {
  type UpsertSubscriptionFromPaymentParams,
  newSubscriptionCommandUsecase,
} from "../subscriptionCommandUsecase";
import { newSubscriptionHistoryRepository } from "../subscriptionHistoryRepository";
import {
  type SubscriptionRepository,
  newSubscriptionRepository,
} from "../subscriptionRepository";

const USER_ID = createUserId(TEST_USER_ID);
const ACTIVE_UNTIL = new Date("2099-01-01T00:00:00.000Z");

function paymentEvent(
  overrides: Partial<UpsertSubscriptionFromPaymentParams> &
    Pick<
      UpsertSubscriptionFromPaymentParams,
      "eventOccurredAt" | "eventSequence" | "paymentProviderId" | "status"
    >,
): UpsertSubscriptionFromPaymentParams {
  return {
    userId: USER_ID,
    plan:
      overrides.status === "active" || overrides.status === "trial"
        ? "premium"
        : "free",
    paymentProvider: "revenuecat",
    eventType: overrides.status,
    webhookId: overrides.eventSequence,
    currentPeriodEnd: overrides.status === "active" ? ACTIVE_UNTIL : undefined,
    trialEnd: overrides.status === "trial" ? ACTIVE_UNTIL : undefined,
    ...overrides,
  };
}

describe("subscription repository PostgreSQL ordering", () => {
  let repository: SubscriptionRepository;
  let command: ReturnType<typeof newSubscriptionCommandUsecase>;

  beforeEach(() => {
    repository = newSubscriptionRepository(testDB);
    command = newSubscriptionCommandUsecase(
      newDrizzleTransactionRunner(testDB),
      repository,
      newSubscriptionHistoryRepository(testDB),
      noopTracer,
    );
  });

  it("rejects an older provider event after a newer event was persisted", async () => {
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-stale",
        eventOccurredAt: new Date("2026-07-02T00:00:00.000Z"),
        eventSequence: "evt-new",
      }),
    );

    const result = await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "expired",
        paymentProviderId: "rc-stale",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-old",
      }),
    );

    expect(result).toBe("ignored");
    await expect(
      repository.findSubscriptionByPaymentProviderId("revenuecat", "rc-stale"),
    ).resolves.toMatchObject({ status: "active", plan: "premium" });
  });

  it("uses provider event sequence to break equal-timestamp ties", async () => {
    const occurredAt = new Date("2026-07-03T00:00:00.000Z");
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-tie",
        eventOccurredAt: occurredAt,
        eventSequence: "evt-a",
      }),
    );

    const applied = await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "expired",
        paymentProviderId: "rc-tie",
        eventOccurredAt: occurredAt,
        eventSequence: "evt-z",
      }),
    );
    const ignored = await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-tie",
        eventOccurredAt: occurredAt,
        eventSequence: "evt-b",
      }),
    );

    expect(applied).toBe("applied");
    expect(ignored).toBe("ignored");
    await expect(
      repository.findSubscriptionByPaymentProviderId("revenuecat", "rc-tie"),
    ).resolves.toMatchObject({ status: "expired", plan: "free" });
  });

  it("rejects a newer event when its status transition is invalid", async () => {
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-transition",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-active",
      }),
    );

    const result = await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "trial",
        paymentProviderId: "rc-transition",
        eventOccurredAt: new Date("2026-07-02T00:00:00.000Z"),
        eventSequence: "evt-trial",
      }),
    );

    expect(result).toBe("ignored");
    await expect(
      repository.findSubscriptionByPaymentProviderId(
        "revenuecat",
        "rc-transition",
      ),
    ).resolves.toMatchObject({ status: "active" });
  });

  it("keeps the newest result when webhooks run in independent transactions", async () => {
    const older = paymentEvent({
      status: "expired",
      paymentProviderId: "rc-parallel",
      eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
      eventSequence: "evt-older",
    });
    const newer = paymentEvent({
      status: "active",
      paymentProviderId: "rc-parallel",
      eventOccurredAt: new Date("2026-07-02T00:00:00.000Z"),
      eventSequence: "evt-newer",
    });

    await Promise.all([
      command.upsertSubscriptionFromPayment(older),
      command.upsertSubscriptionFromPayment(newer),
    ]);

    await expect(
      repository.findSubscriptionByPaymentProviderId(
        "revenuecat",
        "rc-parallel",
      ),
    ).resolves.toMatchObject({
      status: "active",
      plan: "premium",
      lastEventSequence: "evt-newer",
    });
  });

  it("keeps premium entitlement while another provider row expires", async () => {
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: "rc-multi-provider",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-rc-active",
      }),
    );
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProvider: "polar",
        paymentProviderId: "polar-multi-provider",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-polar-active",
      }),
    );

    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "expired",
        paymentProvider: "revenuecat",
        paymentProviderId: "rc-multi-provider",
        eventOccurredAt: new Date("2026-07-02T00:00:00.000Z"),
        eventSequence: "evt-rc-expired",
      }),
    );

    const effective = await repository.findSubscriptionByUserId(USER_ID);
    expect(effective).toMatchObject({
      paymentProvider: "polar",
      paymentProviderId: "polar-multi-provider",
      status: "active",
    });
    expect(effective?.getEffectivePlan()).toBe("premium");
  });

  it("keeps premium entitlement across multiple IDs from the same provider", async () => {
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-original-purchase",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-original-active",
      }),
    );
    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "active",
        paymentProviderId: "rc-repurchase",
        eventOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
        eventSequence: "evt-repurchase-active",
      }),
    );

    await command.upsertSubscriptionFromPayment(
      paymentEvent({
        status: "expired",
        paymentProviderId: "rc-original-purchase",
        eventOccurredAt: new Date("2026-07-02T00:00:00.000Z"),
        eventSequence: "evt-original-expired",
      }),
    );

    const effective = await repository.findSubscriptionByUserId(USER_ID);
    expect(effective).toMatchObject({
      paymentProvider: "revenuecat",
      paymentProviderId: "rc-repurchase",
      status: "active",
    });
    expect(effective?.getEffectivePlan()).toBe("premium");
  });
});
