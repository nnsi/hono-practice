import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native";
import { useGoals } from "../../hooks/useGoals";
import { useActivities } from "../../hooks/useActivities";
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { EditGoalForm } from "./EditGoalForm";

type GoalForEdit = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
};

export function GoalsPage() {
  const { goals } = useGoals();
  const { activities } = useActivities();
  const [showCreate, setShowCreate] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalForEdit | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; emoji: string; quantityUnit: string }
    >();
    for (const a of activities) {
      map.set(a.id, { name: a.name, emoji: a.emoji, quantityUnit: a.quantityUnit });
    }
    return map;
  }, [activities]);

  const activeGoals = useMemo(
    () => goals.filter((g) => g.isActive),
    [goals]
  );
  const inactiveGoals = useMemo(
    () => goals.filter((g) => !g.isActive),
    [goals]
  );

  const editActivityName = editGoal
    ? activityMap.get(editGoal.activityId)?.name || "不明"
    : "";

  return (
    <View className="flex-1 bg-gray-50">
      {goals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🎯</Text>
          <Text className="text-lg font-medium text-gray-600 text-center">
            目標がありません
          </Text>
          <Text className="text-sm text-gray-400 text-center mt-1">
            右下の＋ボタンから目標を設定しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...activeGoals, ...inactiveGoals]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const info = activityMap.get(item.activityId);
            return (
              <GoalCard
                goal={item}
                activityName={info?.name || "不明"}
                activityEmoji={info?.emoji || "🎯"}
                quantityUnit={info?.quantityUnit || ""}
                onPress={() => setEditGoal(item)}
              />
            );
          }}
          ListHeaderComponent={
            activeGoals.length > 0 && inactiveGoals.length > 0 ? (
              <Text className="mx-4 mt-2 mb-1 text-xs text-gray-400 uppercase tracking-wide">
                有効な目標
              </Text>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Dialogs */}
      <CreateGoalDialog
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <EditGoalForm
        visible={editGoal !== null}
        onClose={() => setEditGoal(null)}
        goal={editGoal}
        activityName={editActivityName}
      />
    </View>
  );
}
