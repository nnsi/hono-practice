import { useMemo } from "react";

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
import dayjs from "dayjs";
import { Text, View, useWindowDimensions } from "react-native";

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
        date: `${dayjs(date).date()}日`,
        ...kindsData,
      };
    });
  }, [allDates, stat.kinds]);

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

  const { width: screenWidth } = useWindowDimensions();
  const effectiveWidth = Math.min(screenWidth, 768);
  const gap = 8;
  const cardPaddingX = 16;
  const numColumns = 2;
  const kindCardWidth =
    (effectiveWidth - cardPaddingX * 2 - gap * (numColumns - 1)) / numColumns;

  const isSingleUnnamedKind =
    stat.kinds.length === 1 && stat.kinds[0].name === "未指定";

  return (
    <View className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      {/* Activity header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-900">
          {stat.name}
          {stat.showCombinedStats && stat.total != null && (
            <Text className="text-sm font-normal text-gray-500">
              {"  "}合計:{" "}
              {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
            </Text>
          )}
        </Text>
      </View>

      {/* Kind summary cards */}
      {!isSingleUnnamedKind && (
        <View className="px-4 pt-3">
          <View className="flex-row flex-wrap" style={{ gap }}>
            {stat.kinds.map((kind) => (
              <View
                key={kind.id || kind.name}
                className="bg-white rounded-lg p-3 border border-gray-200"
                style={{ width: kindCardWidth }}
              >
                <Text
                  className="text-xs text-gray-500 mb-0.5"
                  numberOfLines={1}
                >
                  {kind.name}
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{ color: kindColors[kind.name] }}
                >
                  {formatQuantityWithUnit(kind.total, stat.quantityUnit)}
                </Text>
              </View>
            ))}
            {stat.kinds.length % 2 !== 0 && (
              <View style={{ width: kindCardWidth }} />
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
