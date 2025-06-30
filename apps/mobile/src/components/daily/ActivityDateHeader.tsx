import React from "react";

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

export default React.memo(function ActivityDateHeader({
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
    <View className="bg-white px-4 py-3 border-b border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={goToToday}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="今日に戻る"
          >
            <Ionicons name="time-outline" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToPreviousDay}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="前日に移動"
          >
            <Ionicons name="chevron-back" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            className="px-3 py-2"
          >
            <Text className="text-lg font-semibold">
              {dayjs(date).format("YYYY年MM月DD日")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNextDay}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="翌日に移動"
          >
            <Ionicons name="chevron-forward" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel="カレンダーを開く"
        >
          <Ionicons name="calendar-outline" size={24} color="#6b7280" />
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
