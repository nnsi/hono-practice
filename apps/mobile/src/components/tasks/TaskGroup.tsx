import { useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTaskActions } from "../../hooks";
import { TaskEditDialog } from "./TaskEditDialog";

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

interface TaskGroupProps {
  title: string;
  tasks: TaskItem[];
  isLoading: boolean;
  titleColor?: string;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
}

export function TaskGroup({
  title,
  tasks,
  isLoading,
  titleColor = "#374151",
  highlight = false,
  completed = false,
  archived = false,
}: TaskGroupProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const { toggleTaskDone, archiveTask } = useTaskActions();

  const handleTaskClick = (task: TaskItem) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleToggleTaskDone = async (task: TaskItem) => {
    await toggleTaskDone(task);
  };

  const handleArchiveTask = async (task: TaskItem) => {
    await archiveTask(task);
  };

  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: titleColor }]}>
        {title} <Text style={styles.count}>({tasks.length})</Text>
      </Text>

      <View>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, highlight && styles.highlightCard]}
            onPress={() => handleTaskClick(task)}
          >
            <View style={styles.taskContent}>
              {/* チェックボックス */}
              {!archived && (
                <TouchableOpacity
                  onPress={() => handleToggleTaskDone(task)}
                  style={styles.checkbox}
                >
                  <Ionicons
                    name={
                      task.doneDate ? "checkmark-circle" : "ellipse-outline"
                    }
                    size={24}
                    color={task.doneDate ? "#10B981" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              )}

              {/* タスクタイトル */}
              <View style={styles.taskInfo}>
                <Text
                  style={[styles.taskTitle, completed && styles.completedTask]}
                >
                  {task.title}
                </Text>
                {(task.startDate || task.dueDate) && (
                  <Text style={styles.taskDate}>
                    {task.startDate &&
                      `開始: ${dayjs(task.startDate).format("MM/DD")}`}
                    {task.startDate && task.dueDate && " / "}
                    {task.dueDate &&
                      `期限: ${dayjs(task.dueDate).format("MM/DD")}`}
                  </Text>
                )}
              </View>

              {/* アクションボタン */}
              <View style={styles.actions}>
                {/* 完了済みタスクのアーカイブボタン */}
                {task.doneDate && !archived && (
                  <TouchableOpacity
                    onPress={() => handleArchiveTask(task)}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="archive-outline"
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTask && (
        <TaskEditDialog
          visible={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedTask(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  count: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "normal",
  },
  loadingText: {
    color: "#9CA3AF",
  },
  taskCard: {
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  highlightCard: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: "#111827",
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#6B7280",
  },
  taskDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});
