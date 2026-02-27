import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import type { ChartData, StatsKind } from "./types";
import { formatQuantityWithUnit } from "./formatUtils";

type WeekDay = {
  date: string;
  dayOfWeek: string;
  total: number;
  breakdown: Record<string, number>;
};

type WeekEntry = {
  weekStart: dayjs.Dayjs;
  days: WeekDay[];
  weekTotal: number;
};

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
  const [isExpanded, setIsExpanded] = useState(false);

  const weeks = useMemo(() => {
    const weekMap: Record<string, WeekEntry> = {};

    for (const day of data) {
      const dayNumber = Number.parseInt(
        (day.date as string).replace("日", ""),
        10,
      );
      const dateObj = dayjs(month).date(dayNumber);
      const weekKey = dateObj.startOf("week").format("YYYY-MM-DD");

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: dateObj.startOf("week"),
          days: [],
          weekTotal: 0,
        };
      }

      const dayTotal = kinds.reduce((sum, kind) => {
        return sum + (Number(day[kind.name]) || 0);
      }, 0);
      const roundedTotal = Math.round(dayTotal * 1000) / 1000;

      const breakdown: Record<string, number> = {};
      for (const kind of kinds) {
        breakdown[kind.name] = Number(day[kind.name]) || 0;
      }

      weekMap[weekKey].days.push({
        date: dateObj.format("MM/DD"),
        dayOfWeek: dateObj.format("ddd"),
        total: roundedTotal,
        breakdown,
      });

      weekMap[weekKey].weekTotal += roundedTotal;
    }

    return Object.values(weekMap).sort(
      (a, b) => a.weekStart.valueOf() - b.weekStart.valueOf(),
    );
  }, [data, kinds, month]);

  const hasMultipleKinds = kinds.length > 1;

  return (
    <View className="border-t border-gray-200">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between px-4 py-3 bg-white"
        activeOpacity={0.7}
      >
        <Text className="font-semibold text-sm text-gray-900">
          日別・週別 合計値
        </Text>
        {isExpanded ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header */}
            <View className="flex-row bg-gray-50 border-b border-gray-200">
              <View className="w-24 px-3 py-2">
                <Text className="text-xs font-medium text-gray-500">
                  日付
                </Text>
              </View>
              <View className="w-20 px-3 py-2 items-end">
                <Text className="text-xs font-medium text-gray-500">
                  日合計
                </Text>
              </View>
              {hasMultipleKinds &&
                kinds.map((kind) => (
                  <View key={kind.name} className="w-20 px-3 py-2 items-end">
                    <Text
                      className="text-xs font-medium"
                      style={{ color: kindColors[kind.name] || "#6b7280" }}
                      numberOfLines={1}
                    >
                      {kind.name}
                    </Text>
                  </View>
                ))}
              <View className="w-20 px-3 py-2 items-end">
                <Text className="text-xs font-medium text-gray-500">
                  週合計
                </Text>
              </View>
            </View>

            {/* Body */}
            {weeks.map((week, weekIndex) =>
              week.days.map((day, dayIndex) => (
                <View
                  key={`${weekIndex}-${day.date}`}
                  className="flex-row border-b border-gray-100 bg-white"
                >
                  <View className="w-24 px-3 py-1.5">
                    <Text className="text-sm text-gray-900">
                      {day.date} ({day.dayOfWeek})
                    </Text>
                  </View>
                  <View className="w-20 px-3 py-1.5 items-end">
                    <Text className="text-sm font-medium text-gray-900">
                      {day.total > 0
                        ? formatQuantityWithUnit(day.total, quantityUnit)
                        : "-"}
                    </Text>
                  </View>
                  {hasMultipleKinds &&
                    kinds.map((kind) => (
                      <View
                        key={kind.name}
                        className="w-20 px-3 py-1.5 items-end"
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
                    <View className="w-20 px-3 py-1.5 items-end bg-gray-50">
                      <Text className="text-sm font-bold text-gray-900">
                        {formatQuantityWithUnit(
                          Math.round(week.weekTotal * 1000) / 1000,
                          quantityUnit,
                        )}
                      </Text>
                    </View>
                  ) : (
                    <View className="w-20 px-3 py-1.5 bg-gray-50" />
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
