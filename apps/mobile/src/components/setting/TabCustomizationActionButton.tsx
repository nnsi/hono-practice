import { Text, TouchableOpacity } from "react-native";

export function TabCustomizationActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
        {label}
      </Text>
    </TouchableOpacity>
  );
}
