import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Plus, Timer, Square, X } from "lucide-react-native";
import { useActivities } from "../../hooks/useActivities";
import { useTimer } from "../../hooks/useTimer";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";

type SelectedActivity = {
  id: string;
  name: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  quantityUnit: string;
  showCombinedStats: boolean;
};

export function ActikoPage() {
  const { activities } = useActivities();
  const timer = useTimer();
  const [recordActivity, setRecordActivity] =
    useState<SelectedActivity | null>(null);
  const [editActivity, setEditActivity] = useState<SelectedActivity | null>(
    null
  );
  const [showCreate, setShowCreate] = useState(false);
  const [timerInitialQuantity, setTimerInitialQuantity] = useState<
    string | undefined
  >(undefined);

  const handleTimerStop = async () => {
    const result = await timer.stopTimer();
    if (result) {
      const elapsedMinutes = (result.elapsed / 60).toFixed(1);
      const timedActivity = activities.find(
        (a) => a.id === result.activityId
      );
      if (timedActivity) {
        setTimerInitialQuantity(elapsedMinutes);
        setRecordActivity(timedActivity);
      }
    }
  };

  const handleTimerCancel = async () => {
    await timer.cancelTimer();
  };

  const handleRecordClose = () => {
    setRecordActivity(null);
    setTimerInitialQuantity(undefined);
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Timer indicator */}
      {timer.isRunning ? (
        <View className="mx-4 mt-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Timer size={18} color="#3b82f6" />
              <Text className="ml-2 text-sm text-blue-700 font-medium">
                {timer.activityName}
              </Text>
            </View>
            <Text className="text-blue-700 font-bold text-base">
              {formatElapsed(timer.elapsed)}
            </Text>
          </View>
          <View className="flex-row mt-2 gap-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-2 rounded-lg bg-blue-500"
              onPress={handleTimerStop}
            >
              <Square size={14} color="#ffffff" />
              <Text className="ml-1.5 text-white text-sm font-medium">
                停止して記録
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
              onPress={handleTimerCancel}
            >
              <X size={14} color="#6b7280" />
              <Text className="ml-1 text-gray-600 text-sm">取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Activity grid */}
      {activities.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🎯</Text>
          <Text className="text-lg font-medium text-gray-600 text-center">
            アクティビティがありません
          </Text>
          <Text className="text-sm text-gray-400 text-center mt-1">
            右下の＋ボタンから追加しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => setRecordActivity(item)}
            />
          )}
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
      <RecordDialog
        visible={recordActivity !== null}
        onClose={handleRecordClose}
        activity={recordActivity}
        initialQuantity={timerInitialQuantity}
      />
      <CreateActivityDialog
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <EditActivityDialog
        visible={editActivity !== null}
        onClose={() => setEditActivity(null)}
        activity={editActivity}
      />
    </View>
  );
}
