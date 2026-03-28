import { useMemo, useState } from "react";

import type {
  ChartData,
  StatsKind,
} from "@packages/frontend-shared/types/stats";
import {
  formatQuantityWithUnit,
  roundQuantity,
} from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { buildWeeks } from "./buildWeeks";

export function SummaryTable({
  quantityUnit,
  data,
  kinds,
  kindColors,
  month,
}: {
  quantityUnit: string;
  data: ChartData[];
  kinds: StatsKind[];
  kindColors: Record<string, string>;
  month: string;
}) {
  const { t } = useTranslation("stats");
  const [isExpanded, setIsExpanded] = useState(false);
  const weeks = useMemo(
    () => buildWeeks(data, kinds, month),
    [data, kinds, month],
  );
  const hasMultipleKinds = kinds.length > 1;

  return (
    <View className="border-t border-gray-200 dark:border-gray-700">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800"
        activeOpacity={0.7}
      >
        <Text className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {t("tableExpandButton")}
        </Text>
        {isExpanded ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ minWidth: "100%" }}>
            {/* Header */}
            <View className="flex-row bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <View className="px-3 py-2" style={{ width: 88 }}>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("tableDateHeader")}
                </Text>
              </View>
              <View className="px-3 py-2 items-end" style={{ width: 64 }}>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("tableDailyTotalHeader")}
                </Text>
              </View>
              {hasMultipleKinds &&
                kinds.map((kind) => (
                  <View
                    key={kind.name}
                    className="px-3 py-2 items-end"
                    style={{ width: 64 }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: kindColors[kind.name] || "#6b7280" }}
                      numberOfLines={1}
                    >
                      {kind.name}
                    </Text>
                  </View>
                ))}
              <View className="px-3 py-2 items-end" style={{ width: 64 }}>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("tableWeeklyTotalHeader")}
                </Text>
              </View>
            </View>

            {/* Body */}
            {weeks.map((week, weekIndex) =>
              week.days.map((day, dayIndex) => (
                <View
                  key={`${weekIndex}-${day.date}`}
                  className="flex-row border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800"
                >
                  <View className="px-3 py-1.5" style={{ width: 88 }}>
                    <Text className="text-sm text-gray-900 dark:text-gray-100">
                      {day.date} ({day.dayOfWeek})
                    </Text>
                  </View>
                  <View className="px-3 py-1.5 items-end" style={{ width: 64 }}>
                    <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {day.total > 0
                        ? formatQuantityWithUnit(day.total, quantityUnit)
                        : "-"}
                    </Text>
                  </View>
                  {hasMultipleKinds &&
                    kinds.map((kind) => (
                      <View
                        key={kind.name}
                        className="px-3 py-1.5 items-end"
                        style={{ width: 64 }}
                      >
                        <Text
                          className="text-sm"
                          style={{ color: kindColors[kind.name] || "#374151" }}
                        >
                          {day.breakdown[kind.name]
                            ? formatQuantityWithUnit(
                                day.breakdown[kind.name],
                                quantityUnit,
                              )
                            : "-"}
                        </Text>
                      </View>
                    ))}
                  {dayIndex === 0 ? (
                    <View
                      className="px-3 py-1.5 items-end bg-gray-50 dark:bg-gray-800"
                      style={{ width: 64 }}
                    >
                      <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatQuantityWithUnit(
                          roundQuantity(week.weekTotal),
                          quantityUnit,
                        )}
                      </Text>
                    </View>
                  ) : (
                    <View
                      className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800"
                      style={{ width: 64 }}
                    />
                  )}
                </View>
              )),
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
