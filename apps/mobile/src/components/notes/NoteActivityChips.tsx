import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Tag } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";

type Activity = {
  id: string;
  name: string;
};

type NoteActivityChipsProps = {
  activityId: string | null;
  onChangeActivityId: (value: string | null) => void;
  activities: Activity[];
};

function OptionChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${
        selected
          ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100"
          : "border-gray-300 dark:border-gray-600"
      }`}
      activeOpacity={0.7}
      testID={testID}
    >
      <Text
        className={`text-sm ${
          selected
            ? "text-white dark:text-gray-900 font-medium"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function NoteActivityChips({
  activityId,
  onChangeActivityId,
  activities,
}: NoteActivityChipsProps) {
  const { t } = useTranslation("note");
  const [expanded, setExpanded] = useState(false);

  const selectedActivity = activities.find((a) => a.id === activityId);

  if (!expanded) {
    return (
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        className="flex-row items-center gap-1.5 self-start rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("create.label.activity")}
        testID={mobileTestIds.notes.activityToggle}
      >
        <Tag size={14} color="#9ca3af" />
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {selectedActivity?.name ?? t("detail.activityNone")}
        </Text>
      </TouchableOpacity>
    );
  }

  const select = (value: string | null) => {
    onChangeActivityId(value);
    setExpanded(false);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        <OptionChip
          label={t("create.none")}
          selected={activityId === null}
          onPress={() => select(null)}
          testID={mobileTestIds.notes.activityOptionNone}
        />
        {activities.map((activity) => (
          <OptionChip
            key={activity.id}
            label={activity.name}
            selected={activityId === activity.id}
            onPress={() => select(activity.id)}
            testID={mobileTestIds.notes.activityOption(activity.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
