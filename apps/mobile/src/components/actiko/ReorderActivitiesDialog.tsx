import { useState } from "react";

import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useTranslation } from "@packages/i18n";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { activityRepository } from "../../repositories/activityRepository";
import { ActivityIcon } from "../common/ActivityIcon";
import { FormButton } from "../common/FormButton";
import { ModalOverlay } from "../common/ModalOverlay";

type ReorderActivitiesDialogProps = {
  visible: boolean;
  onClose: () => void;
  activities: ActivityRecord[];
};

export function ReorderActivitiesDialog({
  visible,
  onClose,
  activities,
}: ReorderActivitiesDialogProps) {
  const { t } = useTranslation("actiko");
  const { colors } = useThemeContext();
  const iconBlobMap = useIconBlobMap();
  const [items, setItems] = useState(activities);
  const [saving, setSaving] = useState(false);

  // Reset items when dialog opens with new activities
  const [prevActivities, setPrevActivities] = useState(activities);
  if (activities !== prevActivities) {
    setPrevActivities(activities);
    setItems(activities);
  }

  const swap = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await activityRepository.reorderActivities(items.map((a) => a.id));
    setSaving(false);
    onClose();
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose} title={t("reorder")}>
      <View className="gap-1 mb-4">
        {items.map((activity, index) => (
          <View
            key={activity.id}
            className="flex-row items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
          >
            <ActivityIcon
              iconType={activity.iconType}
              emoji={activity.emoji || "\ud83d\udcdd"}
              iconBlob={iconBlobMap.get(activity.id)}
              iconUrl={activity.iconUrl}
              iconThumbnailUrl={activity.iconThumbnailUrl}
              size={28}
              fontSize="text-xl"
            />
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
              {activity.name}
            </Text>
            <View className="flex-row gap-1">
              <TouchableOpacity
                onPress={() => swap(index, -1)}
                disabled={index === 0}
                className="p-1.5 rounded-lg"
                activeOpacity={0.6}
                style={{ opacity: index === 0 ? 0.3 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Move up"
                accessibilityState={{ disabled: index === 0 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowUp size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => swap(index, 1)}
                disabled={index === items.length - 1}
                className="p-1.5 rounded-lg"
                activeOpacity={0.6}
                style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Move down"
                accessibilityState={{ disabled: index === items.length - 1 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowDown size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <FormButton
          variant="secondary"
          label={t("cancel")}
          onPress={onClose}
          className="flex-1"
        />
        <FormButton
          variant="primary"
          label={saving ? t("saving") : t("save")}
          onPress={handleSave}
          disabled={saving}
          className="flex-1"
        />
      </View>
    </ModalOverlay>
  );
}
