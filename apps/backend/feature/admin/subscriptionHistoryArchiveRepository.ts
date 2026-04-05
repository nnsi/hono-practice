import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { subscriptionHistoryArchives } from "@infra/drizzle/schema";

export type NewSubscriptionHistoryArchive =
  typeof subscriptionHistoryArchives.$inferInsert;

export type SubscriptionHistoryArchiveRepository<T = QueryExecutor> = {
  insertArchives: (
    archives: NewSubscriptionHistoryArchive[],
  ) => Promise<number>;
  withTx: (tx: T) => SubscriptionHistoryArchiveRepository<T>;
};

export function newSubscriptionHistoryArchiveRepository(
  db: QueryExecutor,
): SubscriptionHistoryArchiveRepository<QueryExecutor> {
  return {
    insertArchives: insertArchives(db),
    withTx: (tx) => newSubscriptionHistoryArchiveRepository(tx),
  };
}

function insertArchives(db: QueryExecutor) {
  return async (archives: NewSubscriptionHistoryArchive[]): Promise<number> => {
    if (archives.length === 0) return 0;
    const result = await db
      .insert(subscriptionHistoryArchives)
      .values(archives)
      .returning();
    return result.length;
  };
}
