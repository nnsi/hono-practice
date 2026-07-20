import { TEST_USER_ID, testDB } from "@backend/test.setup";
import * as schema from "@infra/drizzle/schema";
import {
  createSubscriptionHistoryId,
  newSubscriptionHistory,
} from "@packages/domain/subscription/subscriptionHistorySchema";
import { createSubscriptionId } from "@packages/domain/subscription/subscriptionSchema";
import { describe, expect, it } from "vitest";

import { newSubscriptionHistoryRepository } from "../subscriptionHistoryRepository";

describe("SubscriptionHistoryRepository (integration)", () => {
  async function seedSubscription(subscriptionId: string) {
    await testDB.insert(schema.userSubscriptions).values({
      id: subscriptionId,
      userId: TEST_USER_ID,
      plan: "premium",
      status: "active",
    });
    return createSubscriptionId(subscriptionId);
  }

  // BUG-6 regression: concurrent delivery of the same webhookId must not
  // create duplicate history rows. Guaranteed by the partial unique index on
  // webhook_id + onConflictDoNothing.
  it("does not create a duplicate history row for the same webhookId", async () => {
    const subId = await seedSubscription(
      "00000000-0000-4000-8000-0000000000c1",
    );
    const repo = newSubscriptionHistoryRepository(testDB);
    const webhookId = "wh_duplicate_1";

    const makeHistory = () =>
      newSubscriptionHistory({
        id: createSubscriptionHistoryId(),
        subscriptionId: subId,
        eventType: "subscription.updated",
        plan: "premium",
        status: "active",
        source: "polar",
        webhookId,
        createdAt: new Date(),
      });

    await repo.insertSubscriptionHistory(makeHistory());
    // Same webhookId, different primary key id -> must be skipped.
    await repo.insertSubscriptionHistory(makeHistory());

    const rows = await repo.findSubscriptionHistoriesBySubscriptionId(subId);
    expect(rows).toHaveLength(1);
    expect(rows[0].webhookId).toBe(webhookId);
  });

  // The unique index is partial (WHERE webhook_id IS NOT NULL), so histories
  // without a webhookId are unaffected.
  it("still records multiple histories when webhookId is null", async () => {
    const subId = await seedSubscription(
      "00000000-0000-4000-8000-0000000000c2",
    );
    const repo = newSubscriptionHistoryRepository(testDB);

    const makeHistory = () =>
      newSubscriptionHistory({
        id: createSubscriptionHistoryId(),
        subscriptionId: subId,
        eventType: "subscription.updated",
        plan: "premium",
        status: "active",
        source: "polar",
        webhookId: null,
        createdAt: new Date(),
      });

    await repo.insertSubscriptionHistory(makeHistory());
    await repo.insertSubscriptionHistory(makeHistory());

    const rows = await repo.findSubscriptionHistoriesBySubscriptionId(subId);
    expect(rows).toHaveLength(2);
  });
});
