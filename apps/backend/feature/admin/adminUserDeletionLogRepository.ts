import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { adminUserDeletionLogs } from "@infra/drizzle/schema";

type InsertDeletionLogParams = {
  deletedUserId: string;
  deletedLoginId: string;
  deletedName: string | null;
  performedByAdminEmail: string;
  deletionCounts: Record<string, number>;
};

export type AdminUserDeletionLogRepository<T = QueryExecutor> = {
  insertDeletionLog: (log: InsertDeletionLogParams) => Promise<void>;
  withTx: (tx: T) => AdminUserDeletionLogRepository<T>;
};

export function newAdminUserDeletionLogRepository(
  db: QueryExecutor,
): AdminUserDeletionLogRepository<QueryExecutor> {
  return {
    insertDeletionLog: insertDeletionLog(db),
    withTx: (tx) => newAdminUserDeletionLogRepository(tx),
  };
}

function insertDeletionLog(db: QueryExecutor) {
  return async (log: InsertDeletionLogParams): Promise<void> => {
    await db.insert(adminUserDeletionLogs).values({
      deletedUserId: log.deletedUserId,
      deletedLoginId: log.deletedLoginId,
      deletedName: log.deletedName,
      performedByAdminEmail: log.performedByAdminEmail,
      deletionCounts: log.deletionCounts,
    });
  };
}
