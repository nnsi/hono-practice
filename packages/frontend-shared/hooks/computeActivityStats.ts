import type { ActivityStat } from "../types/stats";
import { roundQuantity } from "../utils/statsFormatting";

type ActivityBase = {
  id: string;
  name: string;
  quantityUnit: string;
  showCombinedStats: boolean;
};

type KindBase = {
  id: string;
  activityId: string;
  name: string;
  color: string | null;
  orderIndex: string;
};

type LogBase = {
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  date: string;
};

export function computeActivityStats<
  TActivity extends ActivityBase,
  TKind extends KindBase,
  TLog extends LogBase,
>(
  activities: TActivity[],
  allKinds: TKind[],
  monthLogs: TLog[],
): ActivityStat[] {
  const logsByActivity = new Map<string, TLog[]>();
  for (const log of monthLogs) {
    const list = logsByActivity.get(log.activityId) ?? [];
    list.push(log);
    logsByActivity.set(log.activityId, list);
  }

  return activities
    .filter((a) => logsByActivity.has(a.id))
    .map((activity) => {
      const actLogs = logsByActivity.get(activity.id) ?? [];
      const actKinds = allKinds
        .filter((k) => k.activityId === activity.id)
        .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

      const validKindIds = new Set(actKinds.map((k) => k.id));

      const logsByKind = new Map<string | null, TLog[]>();
      for (const log of actLogs) {
        const key =
          log.activityKindId && validKindIds.has(log.activityKindId)
            ? log.activityKindId
            : null;
        const list = logsByKind.get(key) ?? [];
        list.push(log);
        logsByKind.set(key, list);
      }

      const kinds: ActivityStat["kinds"] = [];

      for (const kind of actKinds) {
        const kindLogs = logsByKind.get(kind.id) ?? [];
        const total = kindLogs.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
        kinds.push({
          id: kind.id,
          name: kind.name,
          color: kind.color,
          total: roundQuantity(total),
          logs: kindLogs.map((l) => ({
            date: l.date,
            quantity: l.quantity ?? 0,
          })),
        });
      }

      const unspecifiedLogs = logsByKind.get(null) ?? [];
      if (unspecifiedLogs.length > 0 || actKinds.length === 0) {
        const total = unspecifiedLogs.reduce(
          (sum, l) => sum + (l.quantity ?? 0),
          0,
        );
        kinds.push({
          id: null,
          name: "未指定",
          color: null,
          total: roundQuantity(total),
          logs: unspecifiedLogs.map((l) => ({
            date: l.date,
            quantity: l.quantity ?? 0,
          })),
        });
      }

      const overallTotal = kinds.reduce((sum, k) => sum + k.total, 0);

      return {
        id: activity.id,
        name: activity.name,
        total: activity.showCombinedStats ? roundQuantity(overallTotal) : null,
        quantityUnit: activity.quantityUnit,
        showCombinedStats: activity.showCombinedStats,
        kinds,
      };
    });
}
