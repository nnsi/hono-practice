import { and, asc, between, eq, isNull } from "drizzle-orm";

import { activities, activityKinds, activityLogs } from "@/drizzle/schema";
import { GetActivityStatsResponse } from "@/types/response";

import { type QueryExecutor } from "../infra/drizzle/drizzleInstance";

export type ActivityQueryService = {
  activityStatsQuery: (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<GetActivityStatsResponse[]>;
};

export function newActivityQueryService(
  db: QueryExecutor
): ActivityQueryService {
  return {
    activityStatsQuery: activityStatsQuery(db),
  };
}

function activityStatsQuery(db: QueryExecutor) {
  return async function (userId: string, startDate: Date, endDate: Date) {
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const json = await db
      .select({
        id: activities.id,
        name: activities.name,
        kindid: activityKinds.id,
        kindname: activityKinds.name,
        logid: activityLogs.id,
        date: activityLogs.date,
        quantity: activityLogs.quantity,
      })
      .from(activityLogs)
      .innerJoin(activities, eq(activityLogs.activityId, activities.id))
      .leftJoin(
        activityKinds,
        eq(activityLogs.activityKindId, activityKinds.id)
      )
      .where(
        and(
          eq(activities.userId, userId),
          between(activityLogs.date, startDateStr, endDateStr),
          isNull(activityLogs.deletedAt)
        )
      )
      .orderBy(asc(activities.orderIndex))
      .execute();

    const result = transform(json);

    return result;
  };
}

function transform(
  json: {
    id: string;
    name: string;
    kindid: string | null;
    kindname: string | null;
    logid: string;
    date: string;
    quantity: number | null;
  }[]
) {
  const { stats } = json.reduce(
    (acc, row) => {
      if (!acc.activityMap.has(row.id)) {
        acc.activityMap.set(row.id, acc.stats.length);
        acc.activityKindMap.set(row.kindid || row.id, 0);
        acc.stats.push({
          id: row.id,
          name: row.name,
          total: row.quantity || 0,
          kinds: [
            {
              id: row.kindid || null,
              name: row.kindname || "未指定",
              total: row.quantity || 0,
              logs: [
                {
                  date: row.date,
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
      stats: [] as GetActivityStatsResponse[],
      activityMap: new Map<string, number>(),
      activityKindMap: new Map<string, number>(),
    }
  );

  return stats;
}
