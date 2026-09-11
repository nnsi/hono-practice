import type { TasksTab } from "@packages/frontend-shared/hooks/useTasksPage.types";
import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";

type Tab = TasksTab;

export function TasksTabs({
  activeTab,
  onChange,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}) {
  const { t } = useTranslation("task");
  const tabs: {
    key: Tab;
    labelKey: "page.tab.active" | "page.tab.archived" | "page.tab.schedules";
    testID: string;
  }[] = [
    {
      key: "active",
      labelKey: "page.tab.active",
      testID: mobileTestIds.tasks.activeTab,
    },
    {
      key: "archived",
      labelKey: "page.tab.archived",
      testID: mobileTestIds.tasks.archivedTab,
    },
    {
      key: "schedules",
      labelKey: "page.tab.schedules",
      testID: mobileTestIds.tasks.schedulesTab,
    },
  ];

  return (
    <View
      className="flex-row items-center px-1 h-12 border-b border-gray-100 dark:border-gray-800"
      style={{ paddingRight: 48 }}
    >
      {tabs.map(({ key, labelKey, testID }) => {
        const selected = activeTab === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
              selected ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            accessibilityRole="tab"
            accessibilityLabel={t(labelKey)}
            accessibilityState={{ selected }}
            testID={testID}
          >
            <Text
              className={`text-sm font-medium ${
                selected
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
