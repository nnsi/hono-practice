import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import dayjs from "dayjs";

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
  const date = dayjs(value);

  const prev = () => onChange(date.subtract(1, "day").format("YYYY-MM-DD"));
  const next = () => onChange(date.add(1, "day").format("YYYY-MM-DD"));

  return (
    <View>
      {label ? (
        <Text className="text-sm text-gray-500 mb-1">{label}</Text>
      ) : null}
      <View className="flex-row items-center">
        <TouchableOpacity onPress={prev} className="p-2">
          <ChevronLeft size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-base font-medium mx-2">
          {date.format("YYYY/MM/DD (ddd)")}
        </Text>
        <TouchableOpacity onPress={next} className="p-2">
          <ChevronRight size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
