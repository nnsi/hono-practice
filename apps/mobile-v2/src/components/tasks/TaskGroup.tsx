import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";

type TaskGroupProps = {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
};

export function TaskGroup({
  title,
  count,
  children,
  defaultCollapsed = false,
}: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (count === 0) return null;

  return (
    <View className="mb-2">
      <TouchableOpacity
        className="flex-row items-center px-4 py-2 bg-gray-50"
        onPress={() => setCollapsed((v) => !v)}
      >
        {collapsed ? (
          <ChevronRight size={16} color="#9ca3af" />
        ) : (
          <ChevronDown size={16} color="#9ca3af" />
        )}
        <Text className="text-sm font-medium text-gray-600 ml-1">
          {title}
        </Text>
        <View className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded-full">
          <Text className="text-xs text-gray-500">{count}</Text>
        </View>
      </TouchableOpacity>
      {!collapsed ? children : null}
    </View>
  );
}
