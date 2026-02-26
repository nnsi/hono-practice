import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Plus } from "lucide-react-native";
import dayjs from "dayjs";
import { useTasks } from "../../hooks/useTasks";
import { taskRepository } from "../../repositories/taskRepository";
import { TaskGroup } from "./TaskGroup";
import { TaskCard } from "./TaskCard";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";

type Task = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string;
  archivedAt: string | null;
};

export function TasksPage() {
  const { activeTasks } = useTasks();
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const today = dayjs().format("YYYY-MM-DD");

  const groups = useMemo(() => {
    const overdue: Task[] = [];
    const todayTasks: Task[] = [];
    const upcoming: Task[] = [];
    const noDate: Task[] = [];
    const done: Task[] = [];

    for (const task of activeTasks) {
      if (task.doneDate) {
        done.push(task);
        continue;
      }
      if (!task.dueDate) {
        noDate.push(task);
        continue;
      }
      if (dayjs(task.dueDate).isBefore(today, "day")) {
        overdue.push(task);
      } else if (task.dueDate === today) {
        todayTasks.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return { overdue, todayTasks, upcoming, noDate, done };
  }, [activeTasks, today]);

  const handleToggleDone = async (task: Task) => {
    const newDoneDate = task.doneDate
      ? null
      : dayjs().format("YYYY-MM-DD");
    await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
  };

  const handleLongPress = (task: Task) => {
    Alert.alert("操作", undefined, [
      { text: "編集", onPress: () => setEditTask(task) },
      {
        text: "アーカイブ",
        onPress: () => taskRepository.archiveTask(task.id),
      },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          Alert.alert("削除確認", "このタスクを削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
              text: "削除",
              style: "destructive",
              onPress: () => taskRepository.softDeleteTask(task.id),
            },
          ]);
        },
      },
      { text: "キャンセル", style: "cancel" },
    ]);
  };

  const renderTasks = (tasks: Task[]) =>
    tasks.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        onPress={() => setEditTask(task)}
        onLongPress={() => handleLongPress(task)}
        onToggleDone={() => handleToggleDone(task)}
      />
    ));

  const isEmpty =
    activeTasks.length === 0;

  return (
    <View className="flex-1 bg-gray-50">
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">📋</Text>
          <Text className="text-lg font-medium text-gray-600 text-center">
            タスクがありません
          </Text>
          <Text className="text-sm text-gray-400 text-center mt-1">
            右下の＋ボタンから追加しましょう
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <TaskGroup title="期限切れ" count={groups.overdue.length}>
            {renderTasks(groups.overdue)}
          </TaskGroup>

          <TaskGroup title="今日" count={groups.todayTasks.length}>
            {renderTasks(groups.todayTasks)}
          </TaskGroup>

          <TaskGroup title="今後" count={groups.upcoming.length}>
            {renderTasks(groups.upcoming)}
          </TaskGroup>

          <TaskGroup title="日付なし" count={groups.noDate.length}>
            {renderTasks(groups.noDate)}
          </TaskGroup>

          <TaskGroup
            title="完了"
            count={groups.done.length}
            defaultCollapsed
          >
            {renderTasks(groups.done)}
          </TaskGroup>
        </ScrollView>
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
      <TaskCreateDialog
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <TaskEditDialog
        visible={editTask !== null}
        onClose={() => setEditTask(null)}
        task={editTask}
      />
    </View>
  );
}
