import type {
  ActivityStat,
  ChartData,
  GoalLine,
} from "@packages/frontend-shared/types/stats";
import { DEFAULT_BAR_COLOR } from "@packages/frontend-shared/utils/colorUtils";
import {
  formatQuantityWithUnit,
  roundQuantity,
} from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Text, View } from "react-native";

import { ActivityChart } from "./ActivityChart";

type ActivityChartSectionProps = {
  stat: ActivityStat;
  chartData: ChartData[];
  allDates: string[];
  kindColors: Record<string, string>;
  isSingleUnnamedKind: boolean;
  goalLines: GoalLine[];
};

export function ActivityChartSection({
  stat,
  chartData,
  allDates,
  kindColors,
  isSingleUnnamedKind,
  goalLines,
}: ActivityChartSectionProps) {
  const { t } = useTranslation("stats");
  if (stat.showCombinedStats) {
    return (
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
    );
  }

  if (stat.kinds.length === 1) {
    return (
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
    );
  }

  return (
    <View className="gap-4">
      {stat.kinds.map((kind) => {
        const kindData = allDates.map((date) => {
          const matchingLogs = kind.logs.filter(
            (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
          );
          return {
            date: `${dayjs(date).date()}${t("dateLabel")}`,
            [kind.name]: roundQuantity(
              matchingLogs.reduce((sum, l) => sum + l.quantity, 0),
            ),
          };
        });
        return (
          <View key={kind.id || kind.name}>
            <Text className="font-semibold text-sm mb-1 px-1 text-gray-900">
              {kind.name}
              <Text className="text-gray-400 font-normal">
                {" "}
                ({t("kindTotalLabel")}{" "}
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
  );
}
