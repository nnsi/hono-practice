import { TouchableOpacity, Text, View } from "react-native";

type ActivityCardProps = {
  activity: { id: string; name: string; emoji: string; quantityUnit: string };
  onPress: () => void;
};

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  return (
    <TouchableOpacity
      className="flex-1 m-1 p-4 bg-white rounded-xl border border-gray-200 items-center shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className="text-3xl mb-2">{activity.emoji || "📝"}</Text>
      <Text
        className="text-sm font-medium text-gray-700 text-center"
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
  );
}
