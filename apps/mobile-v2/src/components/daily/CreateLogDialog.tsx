import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { ChevronLeft, X } from "lucide-react-native";
import { LogFormBody } from "../common/LogFormBody";
import { useActivities } from "../../hooks/useActivities";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type CreateLogDialogProps = {
  visible: boolean;
  onClose: () => void;
  date: string;
};

export function CreateLogDialog({
  visible,
  onClose,
  date,
}: CreateLogDialogProps) {
  const { activities } = useActivities();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  const handleClose = () => {
    setSelectedActivity(null);
    onClose();
  };

  if (!visible) return null;

  // Step 2: Show LogFormBody for selected activity
  if (selectedActivity) {
    return (
      <Modal
        visible
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
        >
          <View className="bg-white rounded-t-2xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedActivity(null)}
                  className="p-1"
                >
                  <ChevronLeft size={20} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">
                  {selectedActivity.emoji || "\u{1f4dd}"}{" "}
                  {selectedActivity.name}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} className="p-2">
                <X size={20} color="#78716c" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-3">
              <LogFormBody
                activity={selectedActivity}
                date={date}
                onDone={handleClose}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 1: Activity selection
  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
      >
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">
              アクティビティを選択
            </Text>
            <TouchableOpacity onPress={handleClose} className="p-2">
              <X size={20} color="#78716c" />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-4 py-3">
            {activities.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-400 text-sm">
                  アクティビティがありません
                </Text>
              </View>
            ) : (
              <View className="gap-2 pb-4">
                {activities.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    onPress={() => setSelectedActivity(activity)}
                    className="flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                    activeOpacity={0.7}
                  >
                    <View className="w-10 h-10 items-center justify-center shrink-0">
                      <Text className="text-2xl">
                        {activity.emoji || "\u{1f4dd}"}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-base font-medium text-gray-800">
                        {activity.name}
                      </Text>
                      {activity.quantityUnit ? (
                        <Text className="text-xs text-gray-400">
                          {activity.quantityUnit}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
