import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userSubscriptions } from "@infra/drizzle/schema";
import {
  type Subscription,
  type SubscriptionId,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";

export type SubscriptionRepository<T = QueryExecutor> = {
  createSubscription: (subscription: Subscription) => Promise<Subscription>;
  findSubscriptionById: (
    id: SubscriptionId,
  ) => Promise<Subscription | undefined>;
  findSubscriptionByUserId: (
    userId: UserId,
  ) => Promise<Subscription | undefined>;
  findSubscriptionByPaymentProviderId: (
    providerId: string,
  ) => Promise<Subscription | undefined>;
  updateSubscription: (subscription: Subscription) => Promise<Subscription>;
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
    hardDeleteUserSubscriptionsByUserId:
      hardDeleteUserSubscriptionsByUserId(db),
    withTx: (tx) => newSubscriptionRepository(tx),
  };
}

function hardDeleteUserSubscriptionsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return result.length;
  };
}

function createSubscription(db: QueryExecutor) {
  return async (subscription: Subscription): Promise<Subscription> => {
    const [result] = await db
      .insert(userSubscriptions)
      .values({
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        paymentProvider: subscription.paymentProvider,
        paymentProviderId: subscription.paymentProviderId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        priceAmount: subscription.priceAmount,
        priceCurrency: subscription.priceCurrency,
        metadata: subscription.metadata
          ? JSON.stringify(subscription.metadata)
          : null,
      })
      .returning();

    return mapToSubscription(result);
  };
}

function findSubscriptionById(db: QueryExecutor) {
  return async (id: SubscriptionId): Promise<Subscription | undefined> => {
    const result = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.id, id),
    });

    if (!result) {
      return undefined;
    }

    return mapToSubscription(result);
  };
}

function findSubscriptionByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Subscription | undefined> => {
    const result = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (!result) {
      return undefined;
    }

    return mapToSubscription(result);
  };
}

function findSubscriptionByPaymentProviderId(db: QueryExecutor) {
  return async (providerId: string): Promise<Subscription | undefined> => {
    const result = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.paymentProviderId, providerId),
    });

    if (!result) {
      return undefined;
    }

    return mapToSubscription(result);
  };
}

function updateSubscription(db: QueryExecutor) {
  return async (subscription: Subscription): Promise<Subscription> => {
    const [result] = await db
      .update(userSubscriptions)
      .set({
        plan: subscription.plan,
        status: subscription.status,
        paymentProvider: subscription.paymentProvider,
        paymentProviderId: subscription.paymentProviderId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        priceAmount: subscription.priceAmount,
        priceCurrency: subscription.priceCurrency,
        metadata: subscription.metadata
          ? JSON.stringify(subscription.metadata)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscription.id))
      .returning();

    return mapToSubscription(result);
  };
}

function mapToSubscription(
  row: typeof userSubscriptions.$inferSelect,
): Subscription {
  return newSubscription({
    id: createSubscriptionId(row.id),
    userId: createUserId(row.userId),
    plan: row.plan,
    status: row.status,
    paymentProvider: row.paymentProvider,
    paymentProviderId: row.paymentProviderId,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt,
    trialStart: row.trialStart,
    trialEnd: row.trialEnd,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency ?? "JPY",
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
