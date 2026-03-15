import { useState } from "react";

import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { activityRepository } from "../../repositories/activityRepository";
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
    <ModalOverlay visible={visible} onClose={onClose} title="並び替え">
      <View className="gap-1 mb-4">
        {items.map((activity, index) => (
          <View
            key={activity.id}
            className="flex-row items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
          >
            <Text className="text-xl">{activity.emoji || "\ud83d\udcdd"}</Text>
            <Text className="text-sm font-medium text-gray-800 flex-1">
              {activity.name}
            </Text>
            <View className="flex-row gap-1">
              <TouchableOpacity
                onPress={() => swap(index, -1)}
                disabled={index === 0}
                className="p-1.5 rounded-lg"
                activeOpacity={0.6}
                style={{ opacity: index === 0 ? 0.3 : 1 }}
              >
                <ArrowUp size={16} color="#4b5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => swap(index, 1)}
                disabled={index === items.length - 1}
                className="p-1.5 rounded-lg"
                activeOpacity={0.6}
                style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}
              >
                <ArrowDown size={16} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={onClose}
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl items-center"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-medium text-gray-600">キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-gray-900 rounded-xl items-center"
          activeOpacity={0.7}
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          <Text className="text-sm font-medium text-white">
            {saving ? "保存中..." : "保存"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}
