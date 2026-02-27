import { View, TouchableOpacity, Text } from "react-native";
import { Pencil } from "lucide-react-native";

type ActivityCardProps = {
  activity: { id: string; name: string; emoji: string; quantityUnit: string };
  isDone: boolean;
  onPress: () => void;
  onEdit: () => void;
};

const warmShadow = {
  shadowColor: "#1c1917",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const doneBg = { backgroundColor: "#f0fdfa" };

export function ActivityCard({
  activity,
  isDone,
  onPress,
  onEdit,
}: ActivityCardProps) {
  return (
    <View className="flex-1 m-1 relative">
      <TouchableOpacity
        className={`p-4 rounded-2xl border items-center min-h-[120px] ${
          isDone ? "border-emerald-200" : "border-gray-200"
        }`}
        style={[warmShadow, isDone ? doneBg : { backgroundColor: "#ffffff" }]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <Text className="text-3xl mb-2">{activity.emoji || "\ud83d\udcdd"}</Text>
        <Text
          className="text-sm font-medium text-gray-800 text-center"
          numberOfLines={1}
        >
          {activity.name}
        </Text>
        {activity.quantityUnit ? (
          <Text className="text-xs text-gray-400 mt-1">
            {activity.quantityUnit}
          </Text>
        ) : null}
      </TouchableOpacity>
      {/* Edit button */}
      <TouchableOpacity
        className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white/80"
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <Pencil size={12} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}
