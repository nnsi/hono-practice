import { X } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";
import { OverlayPortal } from "../common/overlayPortal";

type IconBlob = { base64: string; mimeType: string };

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  quantityUnit: string;
  recordingMode: string;
  recordingModeConfig?: string | null;
};

type ActivitySelectOverlayProps = {
  activities: Activity[];
  iconBlobMap: Map<string, IconBlob>;
  onSelect: (activity: Activity) => void;
  onClose: () => void;
};

export function ActivitySelectOverlay({
  activities,
  iconBlobMap,
  onSelect,
  onClose,
}: ActivitySelectOverlayProps) {
  return (
    <OverlayPortal>
      <View className="flex-1">
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(28,25,23,0.35)" },
          ]}
          onPress={onClose}
        />
        <View
          className="flex-1 justify-center items-center p-4"
          pointerEvents="box-none"
        >
          <View
            className="bg-white rounded-2xl w-full max-h-[85%]"
            style={{
              maxWidth: 448,
              shadowColor: "#1c1917",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.16,
              shadowRadius: 48,
              elevation: 24,
            }}
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-900">
                アクティビティを選択
              </Text>
              <TouchableOpacity onPress={onClose} className="p-1.5 rounded-lg">
                <X size={20} color="#78716c" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-5 py-4" style={{ flexShrink: 1 }}>
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
                      onPress={() => onSelect(activity)}
                      className="flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                      activeOpacity={0.7}
                    >
                      <View className="w-10 h-10 items-center justify-center shrink-0">
                        <ActivityIcon
                          iconType={activity.iconType}
                          emoji={activity.emoji || "\u{1f4dd}"}
                          iconBlob={iconBlobMap.get(activity.id)}
                          iconUrl={activity.iconUrl}
                          iconThumbnailUrl={activity.iconThumbnailUrl}
                          size={32}
                        />
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
      </View>
    </OverlayPortal>
  );
}
