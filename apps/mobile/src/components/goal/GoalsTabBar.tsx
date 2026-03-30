import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

type Tab = "active" | "ended";

export function GoalsTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const { t } = useTranslation("goal");
  return (
    <View className="flex-row items-center px-1 h-12 border-b border-gray-100 dark:border-gray-800">
      <TouchableOpacity
        onPress={() => onTabChange("active")}
        className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
          activeTab === "active" ? "bg-gray-100 dark:bg-gray-800" : ""
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === "active"
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          アクティブ
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTabChange("ended")}
        className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
          activeTab === "ended" ? "bg-gray-100 dark:bg-gray-800" : ""
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === "ended"
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {t("tabEnded")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
