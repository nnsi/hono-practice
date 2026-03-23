import type { Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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
  return (
    <View
      className="bg-white rounded-2xl w-full p-4"
      style={{
        maxWidth: 320,
        shadowColor: "#1c1917",
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
        >
          <ChevronLeft size={18} color="#374151" />
        </Pressable>
        <Text className="text-sm font-semibold text-gray-900">
          {viewMonth.format("YYYY年M月")}
        </Text>
        <Pressable
          className="p-2 rounded-full"
          onPress={() => setViewMonth(viewMonth.add(1, "month"))}
        >
          <ChevronRight size={18} color="#374151" />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View className="flex-row mb-1">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center py-1">
            <Text className="text-[10px] font-medium text-gray-400">{w}</Text>
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
                  isSelected ? "bg-gray-900" : ""
                } ${isToday && !isSelected ? "bg-amber-100" : ""}`}
                onPress={() => onSelectDate(cell.date)}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "text-white font-bold"
                      : isToday
                        ? "text-amber-700 font-bold"
                        : cell.currentMonth
                          ? "text-gray-700"
                          : "text-gray-300"
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
          <Text className="text-xs text-amber-600 font-medium">今日に移動</Text>
        </Pressable>
      )}
    </View>
  );
}
