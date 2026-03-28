import type { LucideIcon } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type ActionCardProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

export function ActionCard({ icon: Icon, label, onPress }: ActionCardProps) {
  return (
    <View className="flex-1 m-1">
      <TouchableOpacity
        className="p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 items-center justify-center min-h-[120px]"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon size={28} color="#a8a29e" />
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
