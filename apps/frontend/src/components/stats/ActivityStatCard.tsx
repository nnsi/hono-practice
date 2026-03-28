import type {
  ActivityStat,
  GoalLine,
} from "@packages/frontend-shared/types/stats";
import { DEFAULT_BAR_COLOR } from "@packages/frontend-shared/utils/colorUtils";
import {
  formatQuantityWithUnit,
  roundQuantity,
} from "@packages/frontend-shared/utils/statsFormatting";
import dayjs from "dayjs";

import { ActivityChart } from "./ActivityChart";
import { SummarySection } from "./SummarySection";
import { SummaryTable } from "./SummaryTable";
import { useActivityStatCard } from "./useActivityStatCard";

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
  const { t, kindColors, chartData, summary, isSingleUnnamedKind } =
    useActivityStatCard(stat, allDates);

  return (
    <div className="border rounded-xl overflow-hidden bg-gray-50">
      {/* Activity header */}
      <div className="px-4 py-3 bg-white border-b">
        <h2 className="text-lg font-bold">
          {stat.name}
          {stat.showCombinedStats && stat.total != null && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              {t("kindTotalLabel")}{" "}
              {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
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
                className="bg-white rounded-lg p-3 border shadow-sm min-w-0"
              >
                <div className="text-xs text-gray-500 mb-0.5 truncate">
                  {kind.name}
                </div>
                <div
                  className="text-sm font-bold leading-tight break-all"
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
                  date: `${dayjs(date).date()}${t("dateLabel")}`,
                  values: {
                    [kind.name]: roundQuantity(
                      matchingLogs.reduce((sum, l) => sum + l.quantity, 0),
                    ),
                  },
                };
              });
              return (
                <div key={kind.id || kind.name}>
                  <h4 className="font-semibold text-sm mb-1 px-1">
                    {kind.name}
                    <span className="text-gray-400 font-normal ml-1">
                      ({t("kindTotalLabel")}{" "}
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
      <SummarySection summary={summary} quantityUnit={stat.quantityUnit} />

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
