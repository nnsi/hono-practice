import { useState, useEffect } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import dayjs from "dayjs";

type CalendarPopoverProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function CalendarPopover({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
}: CalendarPopoverProps) {
  const [viewMonth, setViewMonth] = useState(() =>
    dayjs(selectedDate).startOf("month"),
  );

  // Follow selectedDate changes
  useEffect(() => {
    setViewMonth(dayjs(selectedDate).startOf("month"));
  }, [selectedDate]);

  if (!isOpen) return null;

  const today = dayjs().format("YYYY-MM-DD");
  const startDay = viewMonth.startOf("month").day(); // 0=Sunday
  const daysInMonth = viewMonth.daysInMonth();

  // Previous month days for grid padding
  const prevMonth = viewMonth.subtract(1, "month");
  const daysInPrevMonth = prevMonth.daysInMonth();

  // Build grid cells
  const cells: { date: string; day: number; currentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      date: prevMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: viewMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: true,
    });
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - cells.length;
  const nextMonth = viewMonth.add(1, "month");
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: nextMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }

  const handleSelectDate = (date: string) => {
    onDateSelect(date);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full p-4"
          style={{
            maxWidth: 320,
            shadowColor: "#1c1917",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 16,
          }}
          onPress={() => {}}
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
                <Text className="text-[10px] font-medium text-gray-400">
                  {w}
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
                <View key={cell.date} className="items-center" style={{ width: "14.285%" }}>
                  <Pressable
                    className={`w-9 h-9 items-center justify-center rounded-full ${
                      isSelected ? "bg-gray-900" : ""
                    } ${isToday && !isSelected ? "bg-amber-100" : ""}`}
                    onPress={() => handleSelectDate(cell.date)}
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
              onPress={() => handleSelectDate(today)}
            >
              <Text className="text-xs text-amber-600 font-medium">
                今日に移動
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
