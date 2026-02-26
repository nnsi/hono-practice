import { View, Text, TouchableOpacity } from "react-native";
import { useGoalStats } from "../../hooks/useGoalStats";

type GoalCardProps = {
  goal: {
    id: string;
    activityId: string;
    dailyTargetQuantity: number;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
  };
  activityName: string;
  activityEmoji: string;
  quantityUnit: string;
  onPress: () => void;
};

export function GoalCard({
  goal,
  activityName,
  activityEmoji,
  quantityUnit,
  onPress,
}: GoalCardProps) {
  const { totalTarget, totalActual, currentBalance } = useGoalStats(
    goal.id,
    goal.activityId,
    goal.dailyTargetQuantity,
    goal.startDate,
    goal.endDate,
  );

  const progress =
    totalTarget > 0 ? Math.min((totalActual / totalTarget) * 100, 100) : 0;

  return (
    <TouchableOpacity
      className="mx-4 mb-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-2">{activityEmoji || "🎯"}</Text>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-800">
            {activityName}
          </Text>
          <Text className="text-xs text-gray-400">
            日間目標: {goal.dailyTargetQuantity}
            {quantityUnit ? ` ${quantityUnit}` : ""}
          </Text>
        </View>
        {!goal.isActive ? (
          <View className="px-2 py-0.5 bg-gray-100 rounded-full">
            <Text className="text-xs text-gray-500">停止中</Text>
          </View>
        ) : null}
      </View>

      {/* Progress bar */}
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
        <View
          className={`h-full rounded-full ${
            currentBalance >= 0 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">
          {goal.startDate}
          {goal.endDate ? ` ~ ${goal.endDate}` : ""}
        </Text>
        <Text
          className={`text-xs font-medium ${
            currentBalance >= 0 ? "text-green-600" : "text-orange-500"
          }`}
        >
          {currentBalance >= 0 ? "+" : ""}
          {currentBalance}
          {quantityUnit ? ` ${quantityUnit}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
