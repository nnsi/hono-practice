import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userSubscriptions } from "@infra/drizzle/schema";
import type {
  Subscription,
  SubscriptionId,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq } from "drizzle-orm";

import { applyOrderedSubscriptionEvent } from "./orderedSubscriptionEventRepository";
import { selectEffectiveSubscription } from "./subscriptionEntitlementSelector";
import {
  mapToSubscription,
  subscriptionToPersistenceValues,
} from "./subscriptionRepositoryMapper";

export type SubscriptionRepository<T = QueryExecutor> = {
  createSubscription: (subscription: Subscription) => Promise<Subscription>;
  findSubscriptionById: (
    id: SubscriptionId,
  ) => Promise<Subscription | undefined>;
  findSubscriptionByUserId: (
    userId: UserId,
  ) => Promise<Subscription | undefined>;
  findSubscriptionByPaymentProviderId: (
    paymentProvider: string,
    providerId: string,
  ) => Promise<Subscription | undefined>;
  updateSubscription: (subscription: Subscription) => Promise<Subscription>;
  applyOrderedSubscriptionEvent: (
    subscription: Subscription,
  ) => Promise<Subscription | undefined>;
  hardDeleteUserSubscriptionsByUserId: (userId: UserId) => Promise<number>;
  withTx: (tx: T) => SubscriptionRepository<T>;
};

export function newSubscriptionRepository(
  db: QueryExecutor,
): SubscriptionRepository<QueryExecutor> {
  return {
    createSubscription: createSubscription(db),
    findSubscriptionById: findSubscriptionById(db),
    findSubscriptionByUserId: findSubscriptionByUserId(db),
    findSubscriptionByPaymentProviderId:
      findSubscriptionByPaymentProviderId(db),
    updateSubscription: updateSubscription(db),
    applyOrderedSubscriptionEvent: applyOrderedSubscriptionEvent(db),
    hardDeleteUserSubscriptionsByUserId:
      hardDeleteUserSubscriptionsByUserId(db),
    withTx: (tx) => newSubscriptionRepository(tx),
  };
}

function createSubscription(db: QueryExecutor) {
  return async (subscription: Subscription): Promise<Subscription> => {
    const [row] = await db
      .insert(userSubscriptions)
      .values(subscriptionToPersistenceValues(subscription))
      .returning();
    return mapToSubscription(row);
  };
}

function findSubscriptionById(db: QueryExecutor) {
  return async (id: SubscriptionId): Promise<Subscription | undefined> => {
    const row = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.id, id),
    });
    return row ? mapToSubscription(row) : undefined;
  };
}

function findSubscriptionByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Subscription | undefined> => {
    const rows = await db.query.userSubscriptions.findMany({
      where: eq(userSubscriptions.userId, userId),
    });
    return selectEffectiveSubscription(rows.map(mapToSubscription));
  };
}

function findSubscriptionByPaymentProviderId(db: QueryExecutor) {
  return async (
    paymentProvider: string,
    providerId: string,
  ): Promise<Subscription | undefined> => {
    const row = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.paymentProvider, paymentProvider),
        eq(userSubscriptions.paymentProviderId, providerId),
      ),
    });
    return row ? mapToSubscription(row) : undefined;
  };
}

function updateSubscription(db: QueryExecutor) {
  return async (subscription: Subscription): Promise<Subscription> => {
    const {
      id: _id,
      userId: _userId,
      ...values
    } = subscriptionToPersistenceValues(subscription);
    const [row] = await db
      .update(userSubscriptions)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, subscription.id))
      .returning();
    return mapToSubscription(row);
  };
}

function hardDeleteUserSubscriptionsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const rows = await db
      .delete(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return rows.length;
  };
}
