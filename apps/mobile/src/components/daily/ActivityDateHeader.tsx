import { memo } from "react";

import { Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import CalendarModal from "./CalendarModal";

type ActivityDateHeaderProps = {
  date: Date;
  onDateChange: (date: Date) => void;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
};

export default memo(function ActivityDateHeader({
  date,
  onDateChange,
  showCalendar,
  setShowCalendar,
}: ActivityDateHeaderProps) {
  const goToToday = () => onDateChange(new Date());
  const goToPreviousDay = () =>
    onDateChange(dayjs(date).subtract(1, "day").toDate());
  const goToNextDay = () => onDateChange(dayjs(date).add(1, "day").toDate());

  return (
    <View className="bg-white px-4 py-4">
      <View className="flex-row items-center justify-center gap-3">
        <TouchableOpacity
          onPress={goToToday}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="今日に戻る"
        >
          <Ionicons name="time-outline" size={18} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToPreviousDay}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="前日に移動"
        >
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>

        <Text className="text-base">{dayjs(date).format("M/D/YYYY")}</Text>

        <TouchableOpacity
          onPress={goToNextDay}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="翌日に移動"
        >
          <Ionicons name="chevron-forward" size={18} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="カレンダーを開く"
        >
          <Ionicons name="calendar-outline" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={date}
        onSelectDate={(newDate) => {
          onDateChange(newDate);
          setShowCalendar(false);
        }}
      />
    </View>
  );
});
