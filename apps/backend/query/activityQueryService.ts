import { activities, activityKinds, activityLogs } from "@infra/drizzle/schema";
import { and, asc, between, eq, isNull } from "drizzle-orm";


import dayjs from "../lib/dayjs";

import type { QueryExecutor } from "@backend/infra/drizzle";
import type { GetActivityStatsResponse } from "@dtos/response";

export type ActivityQueryService = {
  activityStatsQuery: (
    userId: string,
    startDate: Date,
    endDate: Date,
  ) => Promise<GetActivityStatsResponse>;
  withTx: (tx: QueryExecutor) => ActivityQueryService;
};

export function newActivityQueryService(
  db: QueryExecutor,
): ActivityQueryService {
  return {
    activityStatsQuery: activityStatsQuery(db),
    withTx: (tx) => newActivityQueryService(tx),
  };
}

function activityStatsQuery(db: QueryExecutor) {
  return async (userId: string, startDate: Date, endDate: Date) => {
    const startDateStr = dayjs(startDate).format("YYYY-MM-DD");
    const endDateStr = dayjs(endDate).format("YYYY-MM-DD");

    const rows = await db
      .select({
        id: activities.id,
        name: activities.name,
        kindid: activityKinds.id,
        kindname: activityKinds.name,
        logid: activityLogs.id,
        date: activityLogs.date,
        quantity: activityLogs.quantity,
        quantityUnit: activities.quantityUnit,
      })
      .from(activityLogs)
      .innerJoin(activities, eq(activityLogs.activityId, activities.id))
      .leftJoin(
        activityKinds,
        eq(activityLogs.activityKindId, activityKinds.id),
      )
      .where(
        and(
          eq(activities.userId, userId),
          between(activityLogs.date, startDateStr, endDateStr),
          isNull(activityLogs.deletedAt),
        ),
      )
      .orderBy(asc(activities.orderIndex), asc(activityLogs.date))
      .execute();

    const result = transform(rows);

    return result;
  };
}

function transform(
  rows: {
    id: string;
    name: string;
    kindid: string | null;
    kindname: string | null;
    logid: string;
    date: string;
    quantity: number | null;
    quantityUnit: string | null;
  }[],
) {
  const { stats } = rows.reduce(
    (acc, row) => {
      if (!acc.activityMap.has(row.id)) {
        acc.activityMap.set(row.id, acc.stats.length);
        acc.activityKindMap.set(row.kindid || row.id, 0);
        acc.stats.push({
          id: row.id,
          name: row.name,
          quantityUnit: row.quantityUnit || "",
          total: row.quantity || 0,
          kinds: [
            {
              id: row.kindid || null,
              name: row.kindname || "未指定",
              total: row.quantity || 0,
              logs: [
                {
                  date: dayjs(row.date).format("YYYY-MM-DD"),
                  quantity: row.quantity || 0,
                },
              ],
            },
          ],
        });

        return acc;
      }

      const activity = acc.stats[acc.activityMap.get(row.id)!];
      activity.total += row.quantity || 0;

      const activityKindIndex = acc.activityKindMap.get(row.kindid || row.id)!;

      if (activityKindIndex === undefined) {
        acc.activityKindMap.set(row.kindid || row.id, activity.kinds.length);
        activity.kinds.push({
          id: row.kindid || null,
          name: row.kindname || "未指定",
          total: row.quantity || 0,
          logs: [
            {
              date: row.date,
              quantity: row.quantity || 0,
            },
          ],
        });

        return acc;
      }

      const kind = activity.kinds[activityKindIndex];
      kind.total += row.quantity || 0;
      kind.logs.push({
        date: row.date,
        quantity: row.quantity || 0,
      });

      return acc;
    },
    {
      stats: [] as GetActivityStatsResponse,
      activityMap: new Map<string, number>(),
      activityKindMap: new Map<string, number>(),
    },
  );

  return stats;
}
