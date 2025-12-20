import React, { useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

type CalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export default React.memo(function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: CalendarModalProps) {
  const [viewDate, setViewDate] = useState(selectedDate);

  const startOfMonth = dayjs(viewDate).startOf("month");
  const endOfMonth = dayjs(viewDate).endOf("month");
  const startDate = startOfMonth.startOf("week");
  const endDate = endOfMonth.endOf("week");

  const days = [];
  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    days.push(currentDate.toDate());
    currentDate = currentDate.add(1, "day");
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={onClose}
      >
        <View className="bg-white rounded-lg p-4 m-4 w-11/12 max-w-sm">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() =>
                setViewDate(dayjs(viewDate).subtract(1, "month").toDate())
              }
            >
              <Ionicons name="chevron-back" size={24} color="#6b7280" />
            </TouchableOpacity>

            <Text className="text-lg font-semibold">
              {dayjs(viewDate).format("YYYY年MM月")}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setViewDate(dayjs(viewDate).add(1, "month").toDate())
              }
            >
              <Ionicons name="chevron-forward" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-2">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-sm text-gray-600">{day}</Text>
              </View>
            ))}
          </View>

          <View className="flex-wrap flex-row">
            {days.map((day, _index) => {
              const isCurrentMonth =
                dayjs(day).month() === dayjs(viewDate).month();
              const isSelected = dayjs(day).isSame(selectedDate, "day");
              const isToday = dayjs(day).isSame(new Date(), "day");

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  className="w-1/7 aspect-square p-1"
                  style={{ width: "14.28%" }}
                  onPress={() => onSelectDate(day)}
                >
                  <View
                    className={`flex-1 items-center justify-center rounded-full ${
                      isSelected ? "bg-primary" : isToday ? "bg-primary/20" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "text-white font-bold"
                          : isCurrentMonth
                            ? "text-gray-900"
                            : "text-gray-400"
                      }`}
                    >
                      {dayjs(day).date()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});
