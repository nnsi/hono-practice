import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../src/hooks/useAuth";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const settingsItems = [
    {
      id: "account",
      icon: "person-outline",
      title: "アカウント情報",
      subtitle: user?.name || "名前未設定",
    },
    {
      id: "notifications",
      icon: "notifications-outline",
      title: "通知設定",
      subtitle: "リマインダーや更新情報",
    },
    {
      id: "theme",
      icon: "color-palette-outline",
      title: "テーマ",
      subtitle: "アプリの外観をカスタマイズ",
    },
    {
      id: "privacy",
      icon: "shield-checkmark-outline",
      title: "プライバシー",
      subtitle: "データの管理と保護",
    },
    {
      id: "help",
      icon: "help-circle-outline",
      title: "ヘルプ",
      subtitle: "よくある質問とサポート",
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* ユーザー情報 */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <View className="items-center">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-3">
              <Ionicons name="person" size={40} color="#6b7280" />
            </View>
            <Text className="text-xl font-semibold text-gray-900">
              {user?.name || "ユーザー"}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {user?.loginId || "ログインID未設定"}
            </Text>
          </View>
        </View>

        {/* 設定項目 */}
        <View className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              className={`flex-row items-center p-4 ${
                index !== settingsItems.length - 1
                  ? "border-b border-gray-200"
                  : ""
              }`}
            >
              <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Ionicons name={item.icon as any} size={20} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">{item.title}</Text>
                <Text className="text-gray-500 text-sm">{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ログアウトボタン */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 rounded-lg p-4 mt-6 items-center"
        >
          <Text className="text-red-600 font-medium">ログアウト</Text>
        </TouchableOpacity>

        {/* バージョン情報 */}
        <View className="mt-8 items-center">
          <Text className="text-gray-400 text-sm">Actiko v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}
