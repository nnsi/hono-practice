import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Timer,
  Square,
  X,
} from "lucide-react-native";
import dayjs from "dayjs";
import { useTimer } from "../../hooks/useTimer";
import { useActikoPage } from "./useActikoPage";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { useState } from "react";

export function ActikoPage() {
  const {
    date,
    goToPrev,
    goToNext,
    isToday,
    activities,
    selectedActivity,
    setSelectedActivity,
    dialogOpen,
    setDialogOpen,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    hasLogsForActivity,
    handleActivityClick,
    handleActivityChanged,
  } = useActikoPage();

  const timer = useTimer();
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
        setSelectedActivity(timedActivity);
        setDialogOpen(true);
      }
    }
  };

  const handleTimerCancel = async () => {
    await timer.cancelTimer();
  };

  const handleRecordClose = () => {
    setDialogOpen(false);
    setSelectedActivity(null);
    setTimerInitialQuantity(undefined);
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const dateLabel = dayjs(date).format("M/D (ddd)");

  type GridItem =
    | (typeof activities)[number]
    | { id: "__add__"; name?: never };

  const gridData: GridItem[] = [
    ...activities,
    { id: "__add__" as const },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date navigation header */}
      <View className="relative flex-row items-center justify-center h-12 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="absolute left-4 p-2"
          onPress={goToPrev}
        >
          <ChevronLeft size={20} color="#78716c" />
        </TouchableOpacity>

        {isToday ? (
          <View className="bg-gray-900 rounded-xl px-4 py-1">
            <Text className="text-white text-base font-medium">
              {dateLabel}
            </Text>
          </View>
        ) : (
          <Text className="text-base font-medium text-gray-800">
            {dateLabel}
          </Text>
        )}

        <TouchableOpacity
          className="absolute right-4 p-2"
          onPress={goToNext}
        >
          <ChevronRight size={20} color="#78716c" />
        </TouchableOpacity>
      </View>

      {/* Timer indicator */}
      {timer.isRunning ? (
        <View className="mx-4 mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Timer size={18} color="#f59e0b" />
              <Text className="ml-2 text-sm text-amber-700 font-medium">
                {timer.activityName}
              </Text>
            </View>
            <Text className="text-amber-700 font-bold text-base">
              {formatElapsed(timer.elapsed)}
            </Text>
          </View>
          <View className="flex-row mt-2 gap-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-2 rounded-lg bg-amber-500"
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
          <TouchableOpacity onPress={() => setCreateActivityOpen(true)}>
            <Text className="text-sm text-amber-600 text-center mt-2">
              タップして追加しましょう
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={gridData}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            if (item.id === "__add__") {
              return (
                <TouchableOpacity
                  className="flex-1 m-1 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center min-h-[120px]"
                  onPress={() => setCreateActivityOpen(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={28} color="#a8a29e" />
                  <Text className="text-xs text-gray-400 mt-1">追加</Text>
                </TouchableOpacity>
              );
            }
            const activity = item as (typeof activities)[number];
            const card = (
              <ActivityCard
                activity={activity}
                isDone={hasLogsForActivity(activity.id)}
                onPress={() => handleActivityClick(activity)}
                onEdit={() => setEditActivity(activity)}
              />
            );
            if (Platform.OS === "web") {
              return card;
            }
            return (
              <Animated.View
                entering={FadeInDown.delay(index * 35)
                  .duration(350)
                  .springify()}
                style={{ flex: 1 }}
              >
                {card}
              </Animated.View>
            );
          }}
        />
      )}

      {/* Record dialog */}
      <RecordDialog
        visible={dialogOpen && selectedActivity !== null}
        onClose={handleRecordClose}
        activity={selectedActivity}
        date={date}
        initialQuantity={timerInitialQuantity}
      />

      {/* Create activity dialog */}
      <CreateActivityDialog
        visible={createActivityOpen}
        onClose={() => setCreateActivityOpen(false)}
        onCreated={handleActivityChanged}
      />

      {/* Edit activity dialog */}
      <EditActivityDialog
        visible={editActivity !== null}
        onClose={() => setEditActivity(null)}
        activity={editActivity}
        onUpdated={handleActivityChanged}
      />
    </View>
  );
}
