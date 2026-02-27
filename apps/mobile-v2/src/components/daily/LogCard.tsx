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

export function LogCard({
  log,
  activity,
  kind,
  onPress,
}: {
  log: {
    id: string;
    activityId: string;
    activityKindId: string | null;
    quantity: number | null;
    memo: string;
  };
  activity: Activity | null;
  kind: Kind | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-200"
      style={{
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Icon */}
      <View className="w-10 h-10 items-center justify-center shrink-0">
        <Text className="text-2xl">{activity?.emoji || "\u{1f4dd}"}</Text>
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
            {activity?.name ?? "\u4e0d\u660e"}
          </Text>
          {kind && (
            <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
              {kind.color && (
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: kind.color }}
                />
              )}
              <Text className="text-xs text-gray-500">{kind.name}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500">
          {log.quantity !== null
            ? `${log.quantity}${activity?.quantityUnit ?? ""}`
            : "-"}
        </Text>
        {log.memo ? (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {log.memo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
