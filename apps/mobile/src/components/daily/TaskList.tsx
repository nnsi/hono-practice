import React, { useCallback, useState } from "react";

import type { GetTaskResponse } from "@dtos/index";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";

type TaskListProps = {
  tasks: GetTaskResponse[];
  date: string;
};

export default React.memo(function TaskList({ tasks, date }: TaskListProps) {
  const queryClient = useQueryClient();
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      id,
      doneDate,
    }: {
      id: string;
      doneDate: string | null;
    }) => {
      await apiClient.users.tasks[":id"].$put({
        param: { id },
        json: { doneDate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", date] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiClient.users.tasks.$post({
        json: { title, startDate: date },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", date] });
      setNewTaskTitle("");
      setShowNewTaskForm(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.users.tasks[":id"].$delete({ param: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", date] });
    },
  });

  const toggleTaskDone = useCallback(
    (task: GetTaskResponse) => {
      updateTaskMutation.mutate({
        id: task.id,
        doneDate: task.doneDate ? null : date,
      });
    },
    [date, updateTaskMutation],
  );

  const handleCreateTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      createTaskMutation.mutate(newTaskTitle.trim());
    }
  }, [newTaskTitle, createTaskMutation]);

  const handleDeleteTask = useCallback(
    (id: string) => {
      Alert.alert("タスクの削除", "このタスクを削除しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteTaskMutation.mutate(id),
        },
      ]);
    },
    [deleteTaskMutation],
  );

  return (
    <View>
      {tasks.length === 0 && !showNewTaskForm && (
        <Text className="text-gray-500 text-center py-4 mb-4">
          タスクはありません
        </Text>
      )}
      {tasks.map((task) => (
        <View
          key={task.id}
          className="bg-white p-4 rounded-lg border border-gray-200 mb-2 flex-row items-center justify-between"
        >
          <TouchableOpacity
            onPress={() => toggleTaskDone(task)}
            className="flex-row items-center flex-1"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!task.doneDate }}
            accessibilityLabel={`タスク: ${task.title}`}
          >
            <Ionicons
              name={task.doneDate ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={task.doneDate ? "#10b981" : "#9ca3af"}
            />
            <Text
              className={`ml-3 flex-1 ${
                task.doneDate ? "text-gray-500 line-through" : "text-gray-900"
              }`}
            >
              {task.title}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTask(task.id)}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="タスクを削除"
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}

      {showNewTaskForm ? (
        <View className="bg-white p-4 rounded-lg border border-gray-200 mb-2">
          <TextInput
            className="border border-gray-300 rounded px-3 py-2 mb-2"
            placeholder="タスクのタイトル"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            autoFocus
          />
          <View className="flex-row space-x-2">
            <TouchableOpacity
              className="flex-1 bg-primary rounded py-2 mr-2"
              onPress={handleCreateTask}
            >
              <Text className="text-white text-center font-medium">追加</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-200 rounded py-2"
              onPress={() => {
                setShowNewTaskForm(false);
                setNewTaskTitle("");
              }}
            >
              <Text className="text-gray-700 text-center font-medium">
                キャンセル
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-white p-4 rounded-lg border border-gray-200 mb-2 flex-row items-center justify-center"
          onPress={() => setShowNewTaskForm(true)}
          accessibilityRole="button"
          accessibilityLabel="新しいタスクを追加"
        >
          <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
          <Text className="ml-2 text-primary font-medium">
            新しいタスクを追加
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
