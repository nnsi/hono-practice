import { Text, View } from "react-native";

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5"
      style={{ width: "48%" }}
    >
      <View className="flex-row items-center gap-1.5 mb-1">
        {icon}
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {value}
        </Text>
        {sub && (
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}
