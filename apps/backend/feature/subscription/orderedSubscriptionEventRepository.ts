import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userSubscriptions } from "@infra/drizzle/schema";
import {
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionStatus,
  isAllowedSubscriptionTransition,
} from "@packages/domain/subscription/subscriptionSchema";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";

import {
  mapToSubscription,
  subscriptionToPersistenceValues,
} from "./subscriptionRepositoryMapper";

function allowedPreviousStatuses(
  nextStatus: SubscriptionStatus,
): SubscriptionStatus[] {
  return SUBSCRIPTION_STATUSES.filter((previousStatus) =>
    isAllowedSubscriptionTransition(previousStatus, nextStatus),
  );
}

/**
 * Applies one provider event atomically to its provider subscription row.
 * PostgreSQL evaluates ordering and transition predicates while the conflicting
 * provider identity is locked, preventing stale concurrent events from winning.
 */
export function applyOrderedSubscriptionEvent(db: QueryExecutor) {
  return async (
    subscription: Subscription,
  ): Promise<Subscription | undefined> => {
    if (
      !subscription.paymentProvider ||
      !subscription.paymentProviderId ||
      !subscription.lastEventOccurredAt ||
      !subscription.lastEventSequence
    ) {
      throw new Error(
        "Ordered subscription events require provider identity and ordering metadata",
      );
    }

    const values = subscriptionToPersistenceValues(subscription);
    const { id: _id, userId: _userId, ...mutableValues } = values;
    const orderingCondition = or(
      isNull(userSubscriptions.lastEventOccurredAt),
      lt(
        userSubscriptions.lastEventOccurredAt,
        subscription.lastEventOccurredAt,
      ),
      and(
        eq(
          userSubscriptions.lastEventOccurredAt,
          subscription.lastEventOccurredAt,
        ),
        or(
          isNull(userSubscriptions.lastEventSequence),
          lt(
            userSubscriptions.lastEventSequence,
            subscription.lastEventSequence,
          ),
        ),
      ),
    );

    const [row] = await db
      .insert(userSubscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: [
          userSubscriptions.paymentProvider,
          userSubscriptions.paymentProviderId,
        ],
        set: mutableValues,
        setWhere: and(
          eq(userSubscriptions.userId, subscription.userId),
          orderingCondition,
          inArray(
            userSubscriptions.status,
            allowedPreviousStatuses(subscription.status),
          ),
        ),
      })
      .returning();

    return row ? mapToSubscription(row) : undefined;
  };
}
