import { useEffect } from "react";

import { Pencil } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { activityRepository } from "../../repositories/activityRepository";
import { ActivityIcon } from "../common/ActivityIcon";

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

type ActivityCardProps = {
  activity: {
    id: string;
    name: string;
    emoji: string;
    quantityUnit: string;
    iconType?: "emoji" | "upload" | "generate";
    iconUrl?: string | null;
    iconThumbnailUrl?: string | null;
  };
  isDone: boolean;
  iconBlob?: IconBlob;
  onPress: () => void;
  onEdit: () => void;
};

const warmShadow = {
  shadowColor: "#1c1917",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const doneBg = { backgroundColor: "#f0fdfa" };

export function ActivityCard({
  activity,
  isDone,
  iconBlob,
  onPress,
  onEdit,
}: ActivityCardProps) {
  const { colors } = useThemeContext();

  useEffect(() => {
    if (activity.iconType !== "upload") return;
    if (iconBlob) return;
    const url = activity.iconThumbnailUrl || activity.iconUrl;
    if (!url) return;
    activityRepository.cacheRemoteIcon(activity.id, url);
  }, [
    activity.id,
    activity.iconType,
    activity.iconUrl,
    activity.iconThumbnailUrl,
    iconBlob,
  ]);

  const renderIcon = () => (
    <ActivityIcon
      iconType={activity.iconType}
      emoji={activity.emoji}
      iconBlob={iconBlob}
      iconUrl={activity.iconUrl}
      iconThumbnailUrl={activity.iconThumbnailUrl}
      fontSize="text-3xl"
    />
  );

  return (
    <View className="flex-1 m-1 relative">
      <TouchableOpacity
        className={`p-4 rounded-2xl border items-center min-h-[120px] ${
          isDone
            ? "border-emerald-200 dark:border-emerald-800"
            : "border-gray-200 dark:border-gray-700"
        }`}
        style={[
          warmShadow,
          isDone ? doneBg : { backgroundColor: colors.surface },
        ]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <View className="mb-2">{renderIcon()}</View>
        <Text
          className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center"
          numberOfLines={1}
        >
          {activity.name}
        </Text>
        {activity.quantityUnit ? (
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {activity.quantityUnit}
          </Text>
        ) : null}
      </TouchableOpacity>
      {/* Edit button */}
      <TouchableOpacity
        className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white dark:bg-gray-800/80 dark:bg-gray-700/80"
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <Pencil size={12} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
