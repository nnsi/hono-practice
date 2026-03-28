import { useMemo, useState } from "react";

import type {
  ActivityStat,
  ChartData,
  GoalLine,
} from "@packages/frontend-shared/types/stats";
import { getUniqueColorForKind } from "@packages/frontend-shared/utils/colorUtils";
import {
  formatQuantityWithUnit,
  roundQuantity,
} from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Text, View } from "react-native";

import { ActivityChartSection } from "./ActivityChartSection";
import { SummarySection } from "./SummarySection";
import { SummaryTable } from "./SummaryTable";

export function ActivityStatCard({
  stat,
  allDates,
  month,
  goalLines,
}: {
  stat: ActivityStat;
  allDates: string[];
  month: string;
  goalLines: GoalLine[];
}) {
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

  const [containerWidth, setContainerWidth] = useState(0);
  const gap = 8;
  const numColumns = 3;
  const kindCardWidth = Math.floor(
    (containerWidth - gap * (numColumns - 1)) / numColumns,
  );

  const isSingleUnnamedKind =
    stat.kinds.length === 1 && stat.kinds[0].name === t("defaultKind");

  return (
    <View className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
      {/* Activity header */}
      <View className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {stat.name}
          {stat.showCombinedStats && stat.total != null && (
            <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {"  "}
              {t("kindTotalLabel")}{" "}
              {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
            </Text>
          )}
        </Text>
      </View>

      {/* Kind summary cards */}
      {!isSingleUnnamedKind && (
        <View className="px-4 pt-3">
          <View
            className="flex-row flex-wrap"
            style={{ gap }}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {stat.kinds.map((kind) => (
              <View
                key={kind.id || kind.name}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                style={{ width: kindCardWidth }}
              >
                <Text
                  className="text-xs text-gray-500 dark:text-gray-400 mb-0.5"
                  numberOfLines={1}
                >
                  {kind.name}
                </Text>
                <Text
                  className="text-xs font-bold"
                  style={{ color: kindColors[kind.name] }}
                >
                  {formatQuantityWithUnit(kind.total, stat.quantityUnit)}
                </Text>
              </View>
            ))}
            {stat.kinds.length % numColumns !== 0 &&
              [...Array(numColumns - (stat.kinds.length % numColumns))].map(
                (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static spacers
                  <View key={`spacer-${i}`} style={{ width: kindCardWidth }} />
                ),
              )}
          </View>
        </View>
      )}

      {/* Chart */}
      <View className="p-4">
        <ActivityChartSection
          stat={stat}
          chartData={chartData}
          allDates={allDates}
          kindColors={kindColors}
          isSingleUnnamedKind={isSingleUnnamedKind}
          goalLines={goalLines}
        />
      </View>

      {/* Summary */}
      <SummarySection summary={summary} quantityUnit={stat.quantityUnit} />

      {/* Collapsible daily/weekly table */}
      <SummaryTable
        quantityUnit={stat.quantityUnit}
        data={chartData}
        kinds={stat.kinds}
        kindColors={kindColors}
        month={month}
      />
    </View>
  );
}
