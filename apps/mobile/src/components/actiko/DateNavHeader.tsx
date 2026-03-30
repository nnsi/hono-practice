import dayjs from "dayjs";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type DateNavHeaderProps = {
  date: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleCalendar: () => void;
};

export function DateNavHeader({
  date,
  isToday,
  onPrev,
  onNext,
  onToggleCalendar,
}: DateNavHeaderProps) {
  const dateLabel = dayjs(date).format("M/D (ddd)");

  return (
    <View className="flex-row items-center justify-center gap-3 px-4 h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <TouchableOpacity
        className="p-2"
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ChevronLeft size={20} color="#78716c" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onToggleCalendar}
        className="flex-row items-center"
        accessibilityRole="button"
        accessibilityLabel={`Select date: ${dateLabel}`}
      >
        {isToday ? (
          <View className="flex-row items-center gap-1.5 bg-gray-900 rounded-xl px-4 py-1">
            <Calendar size={14} color="#ffffff" />
            <Text className="text-white text-base font-medium">
              {dateLabel}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5 px-4 py-1">
            <Calendar size={14} color="#1f2937" />
            <Text className="text-base font-medium text-gray-800 dark:text-gray-200">
              {dateLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="p-2"
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ChevronRight size={20} color="#78716c" />
      </TouchableOpacity>
    </View>
  );
}
