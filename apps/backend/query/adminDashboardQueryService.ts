import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityLogs, contacts, users } from "@infra/drizzle/schema";
import { count, gte, isNull } from "drizzle-orm";

import type { ApmProvider, ApmSummary } from "./apmProvider";
import type {
  ClientErrorProvider,
  ClientErrorSummary,
} from "./clientErrorProvider";

export type AdminDashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
  apm: ApmSummary;
  clientErrors: ClientErrorSummary;
};

export type AdminDashboardQueryService = {
  getDashboardData: () => Promise<AdminDashboardData>;
};

export function newAdminDashboardQueryService(
  db: QueryExecutor,
  apmProvider: ApmProvider,
  clientErrorProvider: ClientErrorProvider,
): AdminDashboardQueryService {
  return {
    getDashboardData: getDashboardData(db, apmProvider, clientErrorProvider),
  };
}

function getDashboardData(
  db: QueryExecutor,
  apmProvider: ApmProvider,
  clientErrorProvider: ClientErrorProvider,
) {
  return async (): Promise<AdminDashboardData> => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [dbStats, apm, clientErrors] = await Promise.all([
      Promise.all([
        db
          .select({ count: count() })
          .from(users)
          .where(isNull(users.deletedAt)),
        db.select({ count: count() }).from(contacts),
        db
          .select({ count: count() })
          .from(activityLogs)
          .where(gte(activityLogs.date, sevenDaysAgo)),
      ]),
      apmProvider.getSummary(),
      clientErrorProvider.getSummary(),
    ]);

    const [userCount, contactCount, actionCount] = dbStats;

    return {
      totalUsers: userCount[0]?.count ?? 0,
      totalContacts: contactCount[0]?.count ?? 0,
      recentActionCount: actionCount[0]?.count ?? 0,
      apm,
      clientErrors,
    };
  };
}
