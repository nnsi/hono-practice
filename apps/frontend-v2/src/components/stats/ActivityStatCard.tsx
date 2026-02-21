import { useMemo } from "react";
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
  // Build color map for kinds
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

  // Build chart data: all days of month with kind quantities
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

  // Calculate summary stats
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
    <div className="border rounded-xl overflow-hidden bg-gray-50">
      {/* Activity header */}
      <div className="px-4 py-3 bg-white border-b">
        <h2 className="text-lg font-bold">
          {stat.name}
          {stat.showCombinedStats && stat.total != null && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              合計: {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
            </span>
          )}
        </h2>
      </div>

      {/* Kind summary cards (only if multiple kinds or named kinds) */}
      {!isSingleUnnamedKind && (
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stat.kinds.map((kind) => (
              <div
                key={kind.id || kind.name}
                className="bg-white rounded-lg p-3 border shadow-sm"
              >
                <div className="text-xs text-gray-500 mb-0.5">
                  {kind.name}
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: kindColors[kind.name] }}
                >
                  {formatQuantityWithUnit(kind.total, stat.quantityUnit)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
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
          <div className="space-y-4">
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
                <div key={kind.id || kind.name}>
                  <h4 className="font-semibold text-sm mb-1 px-1">
                    {kind.name}
                    <span className="text-gray-400 font-normal ml-1">
                      (合計:{" "}
                      {formatQuantityWithUnit(kind.total, stat.quantityUnit)})
                    </span>
                  </h4>
                  <ActivityChart
                    data={kindData}
                    dataKeys={[
                      {
                        name: kind.name,
                        color: kindColors[kind.name] || DEFAULT_BAR_COLOR,
                      },
                    ]}
                    height={220}
                    showLegend={false}
                    goalLines={goalLines}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <SummarySection
        summary={summary}
        quantityUnit={stat.quantityUnit}
      />

      {/* Collapsible daily/weekly table */}
      <SummaryTable
        quantityUnit={stat.quantityUnit}
        data={chartData}
        kinds={stat.kinds}
        kindColors={kindColors}
        month={month}
      />
    </div>
  );
}
