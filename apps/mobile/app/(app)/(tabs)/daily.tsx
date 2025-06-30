import React, { useState, useCallback } from "react";

import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { GetActivityLogResponse } from "@dtos/index";

import ActivityDateHeader from "../../../src/components/daily/ActivityDateHeader";
import ActivityLogEditDialog from "../../../src/components/daily/ActivityLogEditDialog";
import TaskList from "../../../src/components/daily/TaskList";
import { useGlobalDate } from "../../../src/hooks/useGlobalDate";
import { apiClient } from "../../../src/utils/apiClient";

export default function DailyPage() {
  const { date, setDate } = useGlobalDate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();

  // 全てのアクティビティを取得
  const { data: allActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const response = await apiClient.users.activities.$get();
      const data = await response.json();
      return data;
    },
  });

  const dateStr = dayjs(date).format("YYYY-MM-DD");
  const { data: activityLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["activity-logs", dateStr],
    queryFn: async () => {
      const response = await apiClient.users["activity-logs"].$get({
        query: { date: dateStr },
      });
      const data = await response.json();
      return data;
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", dateStr],
    queryFn: async () => {
      const response = await apiClient.users.tasks.$get({
        query: { date: dateStr },
      });
      const data = await response.json();
      return data;
    },
  });

  const handleEditLog = useCallback((log: GetActivityLogResponse) => {
    setEditTargetLog(log);
    setEditDialogOpen(true);
  }, []);

  // タブがフォーカスされた時にデータを再取得
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["tasks", dateStr] });
    }, [queryClient, dateStr]),
  );

  const isLoading = activitiesLoading || logsLoading || tasksLoading;

  return (
    <View className="flex-1 bg-gray-50">
      <ActivityDateHeader
        date={date}
        onDateChange={setDate}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4">
          <View className="mb-6">
            <Text className="text-lg font-bold mb-3">活動ログ</Text>
            {activityLogs.length === 0 ? (
              <Text className="text-gray-500 text-center py-4">
                この日の活動ログはありません
              </Text>
            ) : (
              <View>
                {activityLogs.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 mb-2"
                    onPress={() => handleEditLog(log)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">
                          {log.activity.emoji || "📝"}
                        </Text>
                        <View>
                          <Text className="font-semibold">
                            {log.activity.name}
                          </Text>
                          {log.quantity !== null && (
                            <Text className="text-gray-600">
                              {log.quantity} {log.activity.quantityUnit}
                            </Text>
                          )}
                          {log.activityKind && (
                            <Text className="text-sm text-gray-500">
                              {log.activityKind.name}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9ca3af"
                      />
                    </View>
                    {log.memo && (
                      <Text className="text-gray-600 mt-2">{log.memo}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold mb-3">タスク</Text>
            <TaskList tasks={tasks} date={dateStr} />
          </View>

          <View className="h-6" />
        </ScrollView>
      )}

      {editTargetLog && allActivities && (
        <ActivityLogEditDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditTargetLog(null);
          }}
          log={editTargetLog}
          activities={allActivities}
        />
      )}
    </View>
  );
}
