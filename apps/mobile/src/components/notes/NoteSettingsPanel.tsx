import { useTranslation } from "@packages/i18n";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { FormInput } from "../common/FormInput";

type Activity = {
  id: string;
  name: string;
};

type NoteSettingsPanelProps = {
  title: string;
  onChangeTitle: (value: string) => void;
  activityId: string | null;
  onChangeActivityId: (value: string | null) => void;
  activities: Activity[];
  isOpen: boolean;
};

export function NoteSettingsPanel({
  title,
  onChangeTitle,
  activityId,
  onChangeActivityId,
  activities,
  isOpen,
}: NoteSettingsPanelProps) {
  const { t } = useTranslation("note");

  if (!isOpen) return null;

  return (
    <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <View className="px-4 pt-4 pb-6 gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.title")}{" "}
            <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <FormInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder={t("create.placeholder.title")}
            accessibilityLabel={t("create.label.title")}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.activity")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onChangeActivityId(null)}
                className={`px-3 py-1.5 rounded-full border ${
                  activityId === null
                    ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm ${
                    activityId === null
                      ? "text-white dark:text-gray-900 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {t("create.none")}
                </Text>
              </TouchableOpacity>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  onPress={() => onChangeActivityId(activity.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    activityId === activity.id
                      ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm ${
                      activityId === activity.id
                        ? "text-white dark:text-gray-900 font-medium"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {activity.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
