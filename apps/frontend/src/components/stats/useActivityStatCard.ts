import { useMemo } from "react";

import type {
  ActivityStat,
  ChartData,
} from "@packages/frontend-shared/types/stats";
import { getUniqueColorForKind } from "@packages/frontend-shared/utils/colorUtils";
import { roundQuantity } from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";

export function useActivityStatCard(stat: ActivityStat, allDates: string[]) {
  const { t } = useTranslation("stats");

  const kindColors = useMemo(() => {
    const usedColors = new Set<string>();
    const colorMap: Record<string, string> = {};
    for (const kind of stat.kinds) {
      const color = kind.color || getUniqueColorForKind(kind.name, usedColors);
      usedColors.add(color);
      colorMap[kind.name] = color;
    }
    return colorMap;
  }, [stat.kinds]);

  const chartData: ChartData[] = useMemo(() => {
    return allDates.map((date) => {
      const kindsData: Record<string, number> = {};
      for (const kind of stat.kinds) {
        const matchingLogs = kind.logs.filter(
          (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
        );
        kindsData[kind.name] = roundQuantity(
          matchingLogs.reduce((sum, l) => sum + l.quantity, 0),
        );
      }
      return {
        date: `${dayjs(date).date()}${t("dateLabel")}`,
        values: kindsData,
      };
    });
  }, [allDates, stat.kinds, t]);

  const summary = useMemo(() => {
    const totalQuantity = stat.kinds.reduce((sum, k) => sum + k.total, 0);
    const activeDays = new Set(
      stat.kinds.flatMap((k) =>
        k.logs.filter((l) => l.quantity > 0).map((l) => l.date),
      ),
    ).size;
    const daysInMonth = allDates.length;
    const avgPerDay =
      activeDays > 0 ? roundQuantity(totalQuantity / activeDays) : 0;

    return { totalQuantity, activeDays, daysInMonth, avgPerDay };
  }, [stat.kinds, allDates]);

  const isSingleUnnamedKind =
    stat.kinds.length === 1 && stat.kinds[0].name === t("defaultKind");

  return { t, kindColors, chartData, summary, isSingleUnnamedKind };
}
