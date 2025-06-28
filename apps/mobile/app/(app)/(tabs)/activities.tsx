import { useEffect, useState } from "react";

import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState([]);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 新規活動追加ボタン */}
        <TouchableOpacity className="bg-blue-600 rounded-lg p-4 flex-row items-center justify-center mb-6">
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text className="text-white font-semibold ml-2">
            新しい活動を追加
          </Text>
        </TouchableOpacity>

        {/* 活動リスト */}
        <View className="space-y-3">
          {activities.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Ionicons name="clipboard-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4">
                まだ活動が登録されていません
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                上のボタンから新しい活動を追加してください
              </Text>
            </View>
          ) : (
            activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-2xl mr-3">{activity.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">
                        {activity.name}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        単位: {activity.unit}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
