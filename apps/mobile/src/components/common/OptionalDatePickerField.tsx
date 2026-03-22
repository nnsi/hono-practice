import { useState } from "react";

import dayjs from "dayjs";
import { Calendar, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CalendarPopover } from "./CalendarPopover";

type OptionalDatePickerFieldProps = {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function OptionalDatePickerField({
  value,
  onChange,
  label,
  placeholder = "未設定",
  disabled = false,
}: OptionalDatePickerFieldProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const hasValue = value !== "";

  return (
    <View>
      {label ? (
        <Text className="text-sm text-gray-500 mb-1">{label}</Text>
      ) : null}
      <View className="flex-row items-center">
        <Pressable
          className={`flex-1 flex-row items-center border rounded-lg px-3 py-2 ${
            disabled ? "bg-gray-100 border-gray-200" : "border-gray-300"
          }`}
          onPress={() => !disabled && setCalendarOpen(true)}
        >
          <Calendar size={16} color={hasValue ? "#374151" : "#9ca3af"} />
          <Text
            className={`text-sm ml-2 flex-1 ${
              hasValue ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {hasValue ? dayjs(value).format("YYYY/MM/DD") : placeholder}
          </Text>
          {hasValue && !disabled && (
            <Pressable onPress={() => onChange("")} hitSlop={8}>
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </Pressable>
      </View>
      <CalendarPopover
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={value || dayjs().format("YYYY-MM-DD")}
        onDateSelect={onChange}
      />
    </View>
  );
}
