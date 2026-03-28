import { useEffect, useState } from "react";

import dayjs from "dayjs";
import { BackHandler, Modal, Pressable, StyleSheet, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { CalendarCard } from "./CalendarCard";

type CalendarPopoverProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
};

export function CalendarPopover({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
}: CalendarPopoverProps) {
  const { colors } = useThemeContext();
  const [viewMonth, setViewMonth] = useState(() =>
    dayjs(selectedDate).startOf("month"),
  );

  // Follow selectedDate changes
  useEffect(() => {
    setViewMonth(dayjs(selectedDate).startOf("month"));
  }, [selectedDate]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, onClose]);

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
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.modalOverlay },
          ]}
          onPress={onClose}
        />
        <View
          className="flex-1 justify-center items-center px-6"
          pointerEvents="box-none"
        >
          <CalendarCard
            viewMonth={viewMonth}
            setViewMonth={setViewMonth}
            selectedDate={selectedDate}
            today={today}
            cells={cells}
            onSelectDate={handleSelectDate}
          />
        </View>
      </View>
    </Modal>
  );
}
