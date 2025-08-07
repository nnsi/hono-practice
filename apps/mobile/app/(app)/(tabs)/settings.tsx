import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../src/contexts/AuthContext";
import { useAppSettings, useSubscription } from "../../../src/hooks";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const {
    settings,
    updateSetting,
    isLoading: isSettingsLoading,
  } = useAppSettings();
  const { data: subscription } = useSubscription();

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

        {/* アプリ設定 */}
        <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            アプリ設定
          </Text>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1 mr-4">
                <Text className="text-gray-900 font-medium">
                  起動時に目標画面を表示
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  アプリ起動時の初期画面を目標画面にします
                </Text>
              </View>
              <Switch
                value={settings.showGoalOnStartup}
                onValueChange={(value) =>
                  updateSetting("showGoalOnStartup", value)
                }
                trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                thumbColor={settings.showGoalOnStartup ? "#ffffff" : "#f3f4f6"}
              />
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1 mr-4">
                <Text className="text-gray-900 font-medium">
                  目標グラフを非表示
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  負債時間と未実施日のみを表示します
                </Text>
              </View>
              <Switch
                value={settings.hideGoalGraph}
                onValueChange={(value) => updateSetting("hideGoalGraph", value)}
                trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                thumbColor={settings.hideGoalGraph ? "#ffffff" : "#f3f4f6"}
              />
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1 mr-4">
                <Text className="text-gray-900 font-medium">
                  やらなかった日付をデフォルトで表示
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  目標詳細で活動がなかった日付を表示します
                </Text>
              </View>
              <Switch
                value={settings.showInactiveDates}
                onValueChange={(value) =>
                  updateSetting("showInactiveDates", value)
                }
                trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                thumbColor={settings.showInactiveDates ? "#ffffff" : "#f3f4f6"}
              />
            </View>
          </View>
        </View>

        {/* サブスクリプション情報 */}
        {subscription && (
          <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              サブスクリプション
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name={
                  subscription.isActive ? "checkmark-circle" : "close-circle"
                }
                size={20}
                color={subscription.isActive ? "#10b981" : "#ef4444"}
              />
              <Text className="ml-2 text-gray-700">
                {subscription.isActive ? "アクティブ" : "未加入"}
              </Text>
            </View>
            {subscription.expiresAt && (
              <Text className="text-sm text-gray-500 mt-1">
                有効期限:{" "}
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

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
