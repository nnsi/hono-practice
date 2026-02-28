import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Target, Plus } from "lucide-react-native";
import dayjs from "dayjs"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { EditGoalForm } from "./EditGoalForm";
import { RecordDialog } from "../actiko/RecordDialog";
import { useGoalsPage } from "./useGoalsPage";

export function GoalsPage() {
  const {
    activities,
    activityMap,
    currentGoals,
    pastGoals,
    createDialogOpen,
    setCreateDialogOpen,
    editingGoalId,
    setEditingGoalId,
    expandedGoalId,
    recordActivity,
    setRecordActivity,
    handleGoalCreated,
    handleGoalUpdated,
    handleGoalDeleted,
    handleToggleExpand,
  } = useGoalsPage();

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-12 border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <Target size={20} color="#f59e0b" />
          <Text className="text-lg font-bold text-gray-900">目標</Text>
        </View>
        <Text className="text-sm text-gray-500">
          {currentGoals.length}件の目標
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Empty state */}
        {currentGoals.length === 0 && (
          <View className="items-center py-8">
            <Target size={40} color="#d1d5db" />
            <Text className="text-sm text-gray-400 mt-3">
              まだ目標がありません
            </Text>
          </View>
        )}

        {/* Current goals */}
        {currentGoals.map((goal) => {
          const act = activityMap.get(goal.activityId);
          if (editingGoalId === goal.id) {
            return (
              <EditGoalForm
                key={goal.id}
                goal={goal}
                activity={act ?? null}
                onCancel={() => setEditingGoalId(null)}
                onSave={(payload) => handleGoalUpdated(goal.id, payload)}
                onDelete={() => handleGoalDeleted(goal.id)}
              />
            );
          }
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              activity={act ?? null}
              isExpanded={expandedGoalId === goal.id}
              onToggleExpand={() => handleToggleExpand(goal.id)}
              onEditStart={() => setEditingGoalId(goal.id)}
              onRecordOpen={
                act ? () => setRecordActivity(act) : undefined
              }
            />
          );
        })}

        {/* Add new goal button */}
        <TouchableOpacity
          className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 bg-white items-center justify-center flex-row gap-2 mt-2"
          onPress={() => setCreateDialogOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#9ca3af" />
          <Text className="text-sm text-gray-500">新規目標を追加</Text>
        </TouchableOpacity>

        {/* Past goals */}
        {pastGoals.length > 0 && (
          <View className="mt-8">
            <Text className="text-base font-semibold text-gray-500 mb-3">
              過去の目標
            </Text>
            {pastGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                activity={activityMap.get(goal.activityId) ?? null}
                isExpanded={expandedGoalId === goal.id}
                isPast
                onToggleExpand={() => handleToggleExpand(goal.id)}
                onDelete={() => handleGoalDeleted(goal.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create dialog */}
      <CreateGoalDialog
        visible={createDialogOpen}
        activities={activities}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleGoalCreated}
      />

      {/* Record dialog */}
      <RecordDialog
        visible={recordActivity !== null}
        onClose={() => setRecordActivity(null)}
        activity={recordActivity}
        date={dayjs().format("YYYY-MM-DD")}
      />
    </View>
  );
}
