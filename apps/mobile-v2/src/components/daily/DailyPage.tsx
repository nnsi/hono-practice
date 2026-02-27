import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import dayjs from "dayjs";
import { LogCard } from "./LogCard";
import { TaskList } from "./TaskList";
import { EditLogDialog } from "./EditLogDialog";
import { CreateLogDialog } from "./CreateLogDialog";
import { TaskCreateDialog } from "../tasks/TaskCreateDialog";
import { useDailyPage } from "./useDailyPage";

export function DailyPage() {
  const {
    date,
    goToPrev,
    goToNext,
    isToday,
    logs,
    kindsMap,
    activitiesMap,
    tasks,
    editingLog,
    setEditingLog,
    createDialogOpen,
    setCreateDialogOpen,
    taskCreateDialogOpen,
    setTaskCreateDialogOpen,
    handleToggleTask,
  } = useDailyPage();

  const dateLabel = dayjs(date).format("M/D (ddd)");

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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Activity logs section */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              アクティビティ
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => setCreateDialogOpen(true)}
            >
              <Plus size={16} color="#2563eb" />
              <Text className="text-sm text-blue-600 font-medium">追加</Text>
            </TouchableOpacity>
          </View>

          {logs.length > 0 ? (
            <View className="gap-2">
              {logs.map((log) => {
                const activity = activitiesMap.get(log.activityId);
                const kind = log.activityKindId
                  ? kindsMap.get(log.activityKindId)
                  : null;
                return (
                  <LogCard
                    key={log.id}
                    log={log}
                    activity={activity ?? null}
                    kind={kind ?? null}
                    onPress={() => setEditingLog(log)}
                  />
                );
              })}
            </View>
          ) : (
            <View className="items-center py-8">
              <Text className="text-sm text-gray-400">記録がありません</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View className="mx-4 my-6 border-b border-gray-200" />

        {/* Tasks section */}
        <View className="px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              タスク
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => setTaskCreateDialogOpen(true)}
            >
              <Plus size={16} color="#2563eb" />
              <Text className="text-sm text-blue-600 font-medium">追加</Text>
            </TouchableOpacity>
          </View>
          <TaskList
            tasks={tasks}
            isLoading={false}
            onToggle={handleToggleTask}
          />
        </View>
      </ScrollView>

      {/* Edit log dialog */}
      {editingLog && (
        <EditLogDialog
          log={editingLog}
          activity={activitiesMap.get(editingLog.activityId) ?? null}
          onClose={() => setEditingLog(null)}
        />
      )}

      {/* Create log dialog */}
      <CreateLogDialog
        visible={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        date={date}
      />

      {/* Task create dialog */}
      {taskCreateDialogOpen && (
        <TaskCreateDialog
          defaultDate={date}
          onClose={() => setTaskCreateDialogOpen(false)}
          onSuccess={() => setTaskCreateDialogOpen(false)}
        />
      )}
    </View>
  );
}
