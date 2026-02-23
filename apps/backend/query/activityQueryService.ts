import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { GetActivityStatsResponse } from "@dtos/response";
import { activities, activityKinds, activityLogs } from "@infra/drizzle/schema";
import { and, asc, between, eq, isNull } from "drizzle-orm";

import dayjs from "../lib/dayjs";

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
        kindcolor: activityKinds.color,
        logid: activityLogs.id,
        date: activityLogs.date,
        quantity: activityLogs.quantity,
        quantityUnit: activities.quantityUnit,
        showCombinedStats: activities.showCombinedStats,
      })
      .from(activityLogs)
      .innerJoin(activities, eq(activityLogs.activityId, activities.id))
      .leftJoin(
        activityKinds,
        eq(activityLogs.activityKindId, activityKinds.id),
      )
      .where(
        and(
          eq(activityLogs.userId, userId),
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
    kindcolor: string | null;
    logid: string;
    date: string;
    quantity: number | null;
    quantityUnit: string | null;
    showCombinedStats: boolean;
  }[],
) {
  const { stats } = rows.reduce(
    (acc, row) => {
      // 新しいアクティビティの場合
      if (!acc.activityMap.has(row.id)) {
        acc.activityMap.set(row.id, acc.stats.length);
        acc.activityKindMap.set(row.kindid || row.id, 0);
        acc.stats.push({
          id: row.id,
          name: row.name,
          quantityUnit: row.quantityUnit || "",
          total: Math.round((row.quantity || 0) * 100) / 100,
          showCombinedStats: row.showCombinedStats,
          kinds: [
            {
              id: row.kindid || null,
              name: row.kindname || "未指定",
              color: row.kindcolor || null,
              total: Math.round((row.quantity || 0) * 100) / 100,
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

      // 既存のアクティビティの場合
      const activity = acc.stats[acc.activityMap.get(row.id)!];
      // NOTE:GetActivityStatsResponseのtotalはnullableなので型エラー回避でこうやっている
      // 本来はactivity.total += row.quantity || 0;としたい
      // 小数点の計算誤差を防ぐため、小数第2位で四捨五入
      activity.total =
        Math.round(((activity.total || 0) + (row.quantity || 0)) * 100) / 100 ||
        0;

      const activityKindIndex = acc.activityKindMap.get(row.kindid || row.id);

      // 新しい種別の場合
      if (activityKindIndex === undefined) {
        acc.activityKindMap.set(row.kindid || row.id, activity.kinds.length);
        activity.kinds.push({
          id: row.kindid || null,
          name: row.kindname || "未指定",
          color: row.kindcolor || null,
          total: Math.round((row.quantity || 0) * 100) / 100,
          logs: [
            {
              date: row.date,
              quantity: row.quantity || 0,
            },
          ],
        });
        return acc;
      }

      // 既存の種別の場合
      const kind = activity.kinds[activityKindIndex];
      // 小数点の計算誤差を防ぐため、小数第2位で四捨五入
      kind.total = Math.round((kind.total + (row.quantity || 0)) * 100) / 100;
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

  const showCombinedStats = stats.map((stat) => {
    return {
      ...stat,
      total: stat.showCombinedStats ? stat.total : null,
    };
  });

  return showCombinedStats;
}
