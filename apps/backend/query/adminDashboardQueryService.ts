import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import dayjs from "@backend/lib/dayjs";
import {
  activityLogs,
  contacts,
  userSubscriptions,
  users,
} from "@infra/drizzle/schema";
import { and, count, eq, gte, inArray, isNull } from "drizzle-orm";

import type { ApmProvider, ApmSummary } from "./apmProvider";
import type {
  ClientErrorProvider,
  ClientErrorSummary,
} from "./clientErrorProvider";

export type AdminDashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
  premiumUsers: number;
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
    const sevenDaysAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");

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
        db
          .select({ count: count() })
          .from(userSubscriptions)
          .innerJoin(users, eq(userSubscriptions.userId, users.id))
          .where(
            and(
              eq(userSubscriptions.plan, "premium"),
              inArray(userSubscriptions.status, ["active", "trial"]),
              isNull(users.deletedAt),
            ),
          ),
      ]),
      apmProvider.getSummary(),
      clientErrorProvider.getSummary(),
    ]);

    const [userCount, contactCount, actionCount, premiumCount] = dbStats;

    return {
      totalUsers: userCount[0]?.count ?? 0,
      totalContacts: contactCount[0]?.count ?? 0,
      recentActionCount: actionCount[0]?.count ?? 0,
      premiumUsers: premiumCount[0]?.count ?? 0,
      apm,
      clientErrors,
    };
  };
}
