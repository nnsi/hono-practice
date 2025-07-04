import { useState } from "react";

import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  DebtGoalCard,
  GoalCreateDialog,
  MonthlyGoalCard,
} from "../../../src/components/goal";
import { useActivities, useGoals } from "../../../src/hooks";

export default function GoalScreen() {
  const [createDialogVisible, setCreateDialogVisible] = useState(false);

  const { data: goalsData, isLoading, refetch } = useGoals();
  const { activities } = useActivities();

  const goals = goalsData?.goals || [];

  console.log("Goal screen - createDialogVisible:", createDialogVisible);

  const getActivityName = (activityId: string) => {
    const activity = activities.find(
      (a: { id: string; name: string }) => a.id === activityId,
    );
    return activity?.name || "不明なアクティビティ";
  };

  const debtGoals = goals.filter((g) => g.type === "debt");
  const monthlyGoals = goals.filter((g) => g.type === "monthly_target");

  return (
    <>
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor="#3b82f6"
            />
          }
        >
          <View className="p-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold">目標管理</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log(
                    "Button clicked, setting createDialogVisible to true",
                  );
                  Alert.alert("Debug", "Button clicked!");
                  setCreateDialogVisible(true);
                }}
                className="bg-black px-4 py-2 rounded-lg flex-row items-center"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white ml-1">新規目標</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="py-8">
                <Text className="text-center text-gray-500">読み込み中...</Text>
              </View>
            ) : goals.length === 0 ? (
              <View className="py-8">
                <Text className="text-gray-500 text-center">
                  目標がありません。新規目標を作成してください。
                </Text>
              </View>
            ) : (
              <View>
                {debtGoals.map((goal) => (
                  <DebtGoalCard
                    key={goal.id}
                    goal={goal}
                    activityName={getActivityName(goal.activityId)}
                  />
                ))}
                {monthlyGoals.map((goal) => (
                  <MonthlyGoalCard
                    key={goal.id}
                    goal={goal}
                    activityName={getActivityName(goal.activityId)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <GoalCreateDialog
        visible={createDialogVisible}
        onClose={() => setCreateDialogVisible(false)}
        activities={activities}
      />
    </>
  );
}
