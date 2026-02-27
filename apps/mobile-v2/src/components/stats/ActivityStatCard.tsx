import { useMemo } from "react";
import { View, Text } from "react-native";
import dayjs from "dayjs";
import type { ActivityStat, ChartData, GoalLine } from "./types";
import { DEFAULT_BAR_COLOR, getUniqueColorForKind } from "./colorUtils";
import { formatQuantityWithUnit } from "./formatUtils";
import { ActivityChart } from "./ActivityChart";
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
      const color =
        kind.color || getUniqueColorForKind(kind.name, usedColors);
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
        kindsData[kind.name] =
          Math.round(
            matchingLogs.reduce((sum, l) => sum + l.quantity, 0) * 100,
          ) / 100;
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
      activeDays > 0
        ? Math.round((totalQuantity / activeDays) * 100) / 100
        : 0;

    return { totalQuantity, activeDays, daysInMonth, avgPerDay };
  }, [stat.kinds, allDates]);

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
              {"  "}合計: {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
            </Text>
          )}
        </Text>
      </View>

      {/* Kind summary cards */}
      {!isSingleUnnamedKind && (
        <View className="px-4 pt-3">
          <View className="flex-row flex-wrap gap-2">
            {stat.kinds.map((kind) => (
              <View
                key={kind.id || kind.name}
                className="bg-white rounded-lg p-3 border border-gray-200"
                style={{ width: "48%" }}
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
          </View>
        </View>
      )}

      {/* Chart */}
      <View className="p-4">
        {stat.showCombinedStats ? (
          <ActivityChart
            data={chartData}
            dataKeys={stat.kinds.map((k) => ({
              name: k.name,
              color: kindColors[k.name],
            }))}
            stackId="a"
            showLegend={!isSingleUnnamedKind}
            goalLines={goalLines}
          />
        ) : stat.kinds.length === 1 ? (
          <ActivityChart
            data={chartData}
            dataKeys={[
              {
                name: stat.kinds[0].name,
                color: kindColors[stat.kinds[0].name] || DEFAULT_BAR_COLOR,
              },
            ]}
            showLegend={false}
            goalLines={goalLines}
          />
        ) : (
          <View className="gap-4">
            {stat.kinds.map((kind) => {
              const kindData = allDates.map((date) => {
                const matchingLogs = kind.logs.filter(
                  (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
                );
                return {
                  date: `${dayjs(date).date()}日`,
                  [kind.name]:
                    Math.round(
                      matchingLogs.reduce((sum, l) => sum + l.quantity, 0) *
                        100,
                    ) / 100,
                };
              });
              return (
                <View key={kind.id || kind.name}>
                  <Text className="font-semibold text-sm mb-1 px-1 text-gray-900">
                    {kind.name}
                    <Text className="text-gray-400 font-normal">
                      {" "}
                      (合計:{" "}
                      {formatQuantityWithUnit(kind.total, stat.quantityUnit)})
                    </Text>
                  </Text>
                  <ActivityChart
                    data={kindData}
                    dataKeys={[
                      {
                        name: kind.name,
                        color: kindColors[kind.name] || DEFAULT_BAR_COLOR,
                      },
                    ]}
                    height={200}
                    showLegend={false}
                    goalLines={goalLines}
                  />
                </View>
              );
            })}
          </View>
        )}
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
