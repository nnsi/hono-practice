import { ScrollView, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function StatsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 期間選択 */}
        <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-700 font-medium">期間</Text>
            <View className="flex-row items-center">
              <Text className="text-blue-600 mr-2">今週</Text>
              <Ionicons name="chevron-down" size={20} color="#2563eb" />
            </View>
          </View>
        </View>

        {/* 統計サマリー */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            統計サマリー
          </Text>
          <View className="space-y-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">総活動数</Text>
              <Text className="text-gray-900 font-medium">0</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">アクティブ日数</Text>
              <Text className="text-gray-900 font-medium">0日</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">連続記録日数</Text>
              <Text className="text-gray-900 font-medium">0日</Text>
            </View>
          </View>
        </View>

        {/* グラフエリア */}
        <View className="bg-white rounded-lg p-6 border border-gray-200">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            活動グラフ
          </Text>
          <View className="h-48 items-center justify-center">
            <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 mt-4">データがありません</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
