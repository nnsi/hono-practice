import { useTranslation } from "@packages/i18n";
import type { Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";

const WEEKDAY_KEYS = [
  "calendar.sun",
  "calendar.mon",
  "calendar.tue",
  "calendar.wed",
  "calendar.thu",
  "calendar.fri",
  "calendar.sat",
] as const;

type CalendarCell = { date: string; day: number; currentMonth: boolean };

type CalendarCardProps = {
  viewMonth: Dayjs;
  setViewMonth: (m: Dayjs) => void;
  selectedDate: string;
  today: string;
  cells: CalendarCell[];
  onSelectDate: (date: string) => void;
};

export function CalendarCard({
  viewMonth,
  setViewMonth,
  selectedDate,
  today,
  cells,
  onSelectDate,
}: CalendarCardProps) {
  const { t } = useTranslation(["stats", "common"]);
  const { colors } = useThemeContext();

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-2xl w-full p-4"
      style={{
        maxWidth: 320,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 16,
      }}
    >
      {/* Month navigation */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          className="p-2 rounded-full"
          onPress={() => setViewMonth(viewMonth.subtract(1, "month"))}
          accessibilityLabel="Previous month"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={18} color={colors.textSecondary} />
        </Pressable>
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {viewMonth.format(t("monthYearFormat"))}
        </Text>
        <Pressable
          className="p-2 rounded-full"
          onPress={() => setViewMonth(viewMonth.add(1, "month"))}
          accessibilityLabel="Next month"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View className="flex-row mb-1">
        {WEEKDAY_KEYS.map((key) => (
          <View key={key} className="flex-1 items-center py-1">
            <Text className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {t(`common:${key}`)}
            </Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      <View className="flex-row flex-wrap">
        {cells.map((cell) => {
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;

          return (
            <View
              key={cell.date}
              className="items-center"
              style={{ width: "14.285%" }}
            >
              <Pressable
                className={`w-9 h-9 items-center justify-center rounded-full ${
                  isSelected ? "bg-gray-900 dark:bg-gray-100" : ""
                } ${isToday && !isSelected ? "bg-amber-100 dark:bg-amber-900/30" : ""}`}
                onPress={() => onSelectDate(cell.date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={cell.date}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "text-white dark:text-gray-900 dark:text-gray-100 font-bold"
                      : isToday
                        ? "text-amber-700 dark:text-amber-400 font-bold"
                        : cell.currentMonth
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-300 dark:text-gray-600"
                  }`}
                >
                  {cell.day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* "Go to today" button */}
      {selectedDate !== today && (
        <Pressable
          className="mt-3 py-2 items-center rounded-xl"
          onPress={() => onSelectDate(today)}
        >
          <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {t("common:calendar.goToToday")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
