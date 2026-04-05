import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { subscriptionHistories } from "@infra/drizzle/schema";
import {
  type SubscriptionHistory,
  createSubscriptionHistoryId,
  newSubscriptionHistory,
} from "@packages/domain/subscription/subscriptionHistorySchema";
import type { SubscriptionId } from "@packages/domain/subscription/subscriptionSchema";
import { createSubscriptionId } from "@packages/domain/subscription/subscriptionSchema";
import { desc, eq, inArray } from "drizzle-orm";

export type SubscriptionHistoryRepository<T = QueryExecutor> = {
  insertSubscriptionHistory: (history: SubscriptionHistory) => Promise<void>;
  existsByWebhookId: (webhookId: string) => Promise<boolean>;
  findSubscriptionHistoriesBySubscriptionId: (
    subscriptionId: SubscriptionId,
  ) => Promise<SubscriptionHistory[]>;
  findSubscriptionHistoriesBySubscriptionIds: (
    subscriptionIds: string[],
  ) => Promise<SubscriptionHistory[]>;
  hardDeleteSubscriptionHistoriesBySubscriptionIds: (
    subscriptionIds: string[],
  ) => Promise<number>;
  withTx: (tx: T) => SubscriptionHistoryRepository<T>;
};

export function newSubscriptionHistoryRepository(
  db: QueryExecutor,
): SubscriptionHistoryRepository<QueryExecutor> {
  return {
    insertSubscriptionHistory: insertSubscriptionHistory(db),
    existsByWebhookId: existsByWebhookId(db),
    findSubscriptionHistoriesBySubscriptionId:
      findSubscriptionHistoriesBySubscriptionId(db),
    findSubscriptionHistoriesBySubscriptionIds:
      findSubscriptionHistoriesBySubscriptionIds(db),
    hardDeleteSubscriptionHistoriesBySubscriptionIds:
      hardDeleteSubscriptionHistoriesBySubscriptionIds(db),
    withTx: (tx) => newSubscriptionHistoryRepository(tx),
  };
}

function existsByWebhookId(db: QueryExecutor) {
  return async (webhookId: string): Promise<boolean> => {
    const [row] = await db
      .select({ id: subscriptionHistories.id })
      .from(subscriptionHistories)
      .where(eq(subscriptionHistories.webhookId, webhookId))
      .limit(1);
    return !!row;
  };
}

function insertSubscriptionHistory(db: QueryExecutor) {
  return async (history: SubscriptionHistory): Promise<void> => {
    await db
      .insert(subscriptionHistories)
      .values({
        id: history.id,
        subscriptionId: history.subscriptionId,
        eventType: history.eventType,
        plan: history.plan,
        status: history.status,
        source: history.source,
        webhookId: history.webhookId,
        createdAt: history.createdAt,
      })
      .onConflictDoNothing();
  };
}

function findSubscriptionHistoriesBySubscriptionId(db: QueryExecutor) {
  return async (
    subscriptionId: SubscriptionId,
  ): Promise<SubscriptionHistory[]> => {
    const rows = await db
      .select()
      .from(subscriptionHistories)
      .where(eq(subscriptionHistories.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionHistories.createdAt));

    return rows.map((row) =>
      newSubscriptionHistory({
        id: createSubscriptionHistoryId(row.id),
        subscriptionId: createSubscriptionId(row.subscriptionId),
        eventType: row.eventType,
        plan: row.plan,
        status: row.status,
        source: row.source,
        webhookId: row.webhookId,
        createdAt: row.createdAt,
      }),
    );
  };
}

function findSubscriptionHistoriesBySubscriptionIds(db: QueryExecutor) {
  return async (subscriptionIds: string[]): Promise<SubscriptionHistory[]> => {
    if (subscriptionIds.length === 0) return [];
    const rows = await db
      .select()
      .from(subscriptionHistories)
      .where(inArray(subscriptionHistories.subscriptionId, subscriptionIds))
      .orderBy(desc(subscriptionHistories.createdAt));

    return rows.map((row) =>
      newSubscriptionHistory({
        id: createSubscriptionHistoryId(row.id),
        subscriptionId: createSubscriptionId(row.subscriptionId),
        eventType: row.eventType,
        plan: row.plan,
        status: row.status,
        source: row.source,
        webhookId: row.webhookId,
        createdAt: row.createdAt,
      }),
    );
  };
}

function hardDeleteSubscriptionHistoriesBySubscriptionIds(db: QueryExecutor) {
  return async (subscriptionIds: string[]): Promise<number> => {
    if (subscriptionIds.length === 0) return 0;
    const result = await db
      .delete(subscriptionHistories)
      .where(inArray(subscriptionHistories.subscriptionId, subscriptionIds))
      .returning();
    return result.length;
  };
}
