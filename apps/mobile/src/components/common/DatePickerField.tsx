import { useState } from "react";

import dayjs from "dayjs";
import { Calendar } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CalendarPopover } from "./CalendarPopover";

type DatePickerFieldProps = {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
};

export function DatePickerField({
  value,
  onChange,
  label,
}: DatePickerFieldProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <View>
      {label ? (
        <Text className="text-sm text-gray-500 mb-1">{label}</Text>
      ) : null}
      <Pressable
        className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2"
        onPress={() => setCalendarOpen(true)}
      >
        <Calendar size={16} color="#374151" />
        <Text className="text-sm ml-2 text-gray-900">
          {dayjs(value).format("YYYY/MM/DD (ddd)")}
        </Text>
      </Pressable>
      <CalendarPopover
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={value}
        onDateSelect={onChange}
      />
    </View>
  );
}
