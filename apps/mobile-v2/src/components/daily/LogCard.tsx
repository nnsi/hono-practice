import { View, Text, TouchableOpacity } from "react-native";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type Kind = {
  id: string;
  name: string;
  color: string | null;
};

type LogCardProps = {
  log: {
    id: string;
    activityId: string;
    activityKindId: string | null;
    quantity: number | null;
    memo: string;
    time: string | null;
  };
  activity: Activity | undefined;
  kind: Kind | undefined;
  onPress: () => void;
  onLongPress: () => void;
};

export function LogCard({
  log,
  activity,
  kind,
  onPress,
  onLongPress,
}: LogCardProps) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 p-3 bg-white rounded-xl border border-gray-200"
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">{activity?.emoji || "📝"}</Text>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-medium text-gray-800">
              {activity?.name || "不明"}
            </Text>
            {kind ? (
              <View className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full">
                <Text className="text-xs text-gray-600">{kind.name}</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center mt-0.5">
            {log.quantity != null && activity?.quantityUnit ? (
              <Text className="text-sm text-gray-500">
                {log.quantity} {activity.quantityUnit}
              </Text>
            ) : null}
            {log.time ? (
              <Text className="text-sm text-gray-400 ml-2">{log.time}</Text>
            ) : null}
          </View>
          {log.memo ? (
            <Text
              className="text-xs text-gray-400 mt-1"
              numberOfLines={1}
            >
              {log.memo}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
