import {
  type Subscription,
  type SubscriptionId,
  createSubscriptionId,
  newSubscription,
} from "@backend/domain/subscription";
import { type UserId, createUserId } from "@backend/domain/user";
import { userSubscriptions } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type SubscriptionRepository<T = any> = {
  create: (subscription: Subscription) => Promise<Subscription>;
  findById: (id: SubscriptionId) => Promise<Subscription | undefined>;
  findByUserId: (userId: UserId) => Promise<Subscription | undefined>;
  update: (subscription: Subscription) => Promise<Subscription>;
  withTx: (tx: T) => SubscriptionRepository<T>;
};

export function newSubscriptionRepository(
  db: QueryExecutor,
): SubscriptionRepository<QueryExecutor> {
  return {
    create: create(db),
    findById: findById(db),
    findByUserId: findByUserId(db),
    update: update(db),
    withTx: (tx) => newSubscriptionRepository(tx),
  };
}

function create(db: QueryExecutor) {
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

function findById(db: QueryExecutor) {
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

function findByUserId(db: QueryExecutor) {
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

function update(db: QueryExecutor) {
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

function mapToSubscription(row: any): Subscription {
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
    priceCurrency: row.priceCurrency,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
