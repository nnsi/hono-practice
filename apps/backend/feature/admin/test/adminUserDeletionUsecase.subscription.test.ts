import {
  createSubscriptionHistoryId,
  newSubscriptionHistory,
} from "@packages/domain/subscription/subscriptionHistorySchema";
import {
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, deepEqual, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { newAdminUserDeletionUsecase } from "../adminUserDeletionUsecase";
import {
  type Mocks,
  createMocks,
  createUsecase,
  mockUser,
  resetMocks,
  setupDefaultStubs,
  testAdminEmail,
  testLoginId,
  testUserId,
} from "./adminUserDeletionUsecase.setup";

const uid = createUserId(testUserId);

function buildSubscription(
  subscriptionId: ReturnType<typeof createSubscriptionId>,
) {
  return newSubscription({
    id: subscriptionId,
    userId: uid,
    plan: "premium",
    status: "active",
    paymentProvider: "stripe",
    paymentProviderId: "sub_test",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: null,
    priceCurrency: "JPY",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("AdminUserDeletionUsecase - subscription archive", () => {
  let mocks: Mocks;
  let usecase: ReturnType<typeof newAdminUserDeletionUsecase>;

  beforeEach(() => {
    mocks = createMocks();
    usecase = createUsecase(mocks);
    resetMocks(mocks);
    setupDefaultStubs(mocks);
    when(mocks.userRepo.getUserById(anything())).thenResolve(mockUser);
  });

  it("subscription あり + 履歴2件: archive エントリが生成され hardDelete が呼ばれる", async () => {
    const subscriptionId = createSubscriptionId(
      "00000000-0000-4000-8000-000000000010",
    );
    const mockSubscription = buildSubscription(subscriptionId);
    const mockHistories = [
      newSubscriptionHistory({
        id: createSubscriptionHistoryId("00000000-0000-4000-8000-000000000021"),
        subscriptionId,
        eventType: "subscription_created",
        plan: "premium",
        status: "active",
        source: "stripe",
        webhookId: "wh_001",
        createdAt: new Date("2024-01-01"),
      }),
      newSubscriptionHistory({
        id: createSubscriptionHistoryId("00000000-0000-4000-8000-000000000022"),
        subscriptionId,
        eventType: "subscription_updated",
        plan: "free",
        status: "cancelled",
        source: "stripe",
        webhookId: null,
        createdAt: new Date("2024-02-01"),
      }),
    ];

    when(
      mocks.subscriptionRepo.findSubscriptionByUserId(anything()),
    ).thenResolve(mockSubscription);
    when(
      mocks.subscriptionHistoryRepo.findSubscriptionHistoriesBySubscriptionIds(
        anything(),
      ),
    ).thenResolve(mockHistories);
    when(mocks.archiveRepo.insertArchives(anything())).thenResolve(2);
    when(
      mocks.subscriptionHistoryRepo.hardDeleteSubscriptionHistoriesBySubscriptionIds(
        anything(),
      ),
    ).thenResolve(2);
    when(
      mocks.subscriptionRepo.hardDeleteUserSubscriptionsByUserId(anything()),
    ).thenResolve(1);

    const result = await usecase.deleteUserPermanently(
      testUserId,
      testLoginId,
      testAdminEmail,
    );

    verify(mocks.archiveRepo.insertArchives(anything())).called();
    verify(
      mocks.subscriptionHistoryRepo.hardDeleteSubscriptionHistoriesBySubscriptionIds(
        deepEqual([subscriptionId]),
      ),
    ).called();
    verify(
      mocks.subscriptionRepo.hardDeleteUserSubscriptionsByUserId(anything()),
    ).called();
    expect(result.deletionCounts.subscriptionHistoriesArchived).toBe(2);
    expect(result.deletionCounts.userSubscriptions).toBe(1);
  });

  it("subscription あり + 履歴0件: insertArchives が空配列で呼ばれる", async () => {
    const subscriptionId = createSubscriptionId(
      "00000000-0000-4000-8000-000000000030",
    );
    when(
      mocks.subscriptionRepo.findSubscriptionByUserId(anything()),
    ).thenResolve(buildSubscription(subscriptionId));

    const result = await usecase.deleteUserPermanently(
      testUserId,
      testLoginId,
      testAdminEmail,
    );

    verify(mocks.archiveRepo.insertArchives(deepEqual([]))).called();
    expect(result.deletionCounts.subscriptionHistoriesArchived).toBe(0);
  });
});
