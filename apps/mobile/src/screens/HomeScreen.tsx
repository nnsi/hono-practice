import { useEffect, useState } from "react";

import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../hooks/useAuth";

type Activity = {
  id: string;
  emoji: string;
  name: string;
  value: number;
  unit: string;
  time: string;
};

export function HomeScreen() {
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* ウェルカムメッセージ */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">
            こんにちは、{user?.name || "ユーザー"}さん！
          </Text>
          <Text className="text-gray-600 mt-2">
            今日も活動を記録していきましょう
          </Text>
        </View>

        {/* クイックアクション */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            クイックアクション
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity className="bg-blue-600 rounded-lg p-4 flex-1 mr-2">
              <View className="items-center">
                <Ionicons name="add-circle-outline" size={28} color="white" />
                <Text className="text-white font-medium mt-2">記録する</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="bg-green-600 rounded-lg p-4 flex-1 ml-2">
              <View className="items-center">
                <Ionicons name="timer-outline" size={28} color="white" />
                <Text className="text-white font-medium mt-2">タイマー</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 今日の活動サマリー */}
        <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            今日の活動
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-3xl font-bold text-blue-600">0</Text>
              <Text className="text-gray-600 text-sm">記録数</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-green-600">0</Text>
              <Text className="text-gray-600 text-sm">活動種類</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-purple-600">0</Text>
              <Text className="text-gray-600 text-sm">連続日数</Text>
            </View>
          </View>
        </View>

        {/* 最近の活動 */}
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            最近の活動
          </Text>
          {recentActivities.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center border border-gray-200">
              <Ionicons name="time-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                まだ活動記録がありません
              </Text>
              <TouchableOpacity className="mt-4 bg-blue-100 px-4 py-2 rounded-lg">
                <Text className="text-blue-600 font-medium">
                  最初の記録を追加
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-2">
              {recentActivities.map((activity) => (
                <View
                  key={activity.id}
                  className="bg-white rounded-lg p-4 border border-gray-200"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-2xl mr-3">{activity.emoji}</Text>
                      <View>
                        <Text className="text-gray-900 font-medium">
                          {activity.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {activity.value} {activity.unit}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm">
                      {activity.time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
