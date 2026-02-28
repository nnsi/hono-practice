import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { EditGoalForm } from "./EditGoalForm";
import { RecordDialog } from "../actiko/RecordDialog";
import { useGoalsPage } from "./useGoalsPage";

export function GoalsPage() {
  const {
    activeTab,
    setActiveTab,
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

  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      {/* Tabs */}
      <View className="flex-row items-center px-1 h-12 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab("active")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "active" ? "bg-gray-100" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "active" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            アクティブ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("ended")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "ended" ? "bg-gray-100" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "ended" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            終了済み
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 + insets.bottom }}>
        {activeTab === "active" && (
          <View>
            {/* Empty state */}
            {currentGoals.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-sm text-gray-400">
                  アクティブな目標がありません
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
          </View>
        )}

        {activeTab === "ended" && (
          <View>
            {pastGoals.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-sm text-gray-400">
                  終了済みの目標はありません
                </Text>
              </View>
            )}

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
