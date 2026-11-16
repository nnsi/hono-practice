import { useEffect } from "react";

import {
  type ActivityDaySummary,
  formatActivityDaySummary,
} from "@packages/frontend-shared/hooks/activityDaySummary";
import { formatQuantityWithUnit } from "@packages/frontend-shared/utils/statsFormatting";
import { Pencil } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { activityRepository } from "../../repositories/activityRepository";
import { mobileTestIds } from "../../testing/testIds";
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
  summary?: ActivityDaySummary;
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
  summary,
  iconBlob,
  onPress,
  onEdit,
}: ActivityCardProps) {
  const { colors } = useThemeContext();
  // 記録済みならその日の合計、数量の無い記録だけなら件数。未記録なら null
  const doneLabel = formatActivityDaySummary(summary, (total) =>
    formatQuantityWithUnit(total, activity.quantityUnit),
  );
  const isDone = doneLabel !== null;

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

  return (
    <View className="m-1 relative">
      <TouchableOpacity
        className={`px-1.5 py-2 rounded-2xl border items-center justify-center min-h-[88px] ${
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
        accessibilityRole="button"
        accessibilityLabel={activity.name}
        testID={mobileTestIds.actikoCard.activity(activity.id)}
      >
        <View className="mb-1.5">
          <ActivityIcon
            iconType={activity.iconType}
            emoji={activity.emoji}
            iconBlob={iconBlob}
            iconUrl={activity.iconUrl}
            iconThumbnailUrl={activity.iconThumbnailUrl}
            size={28}
            fontSize="text-2xl"
          />
        </View>
        <Text
          className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center"
          numberOfLines={1}
        >
          {activity.name}
        </Text>
        {/* 行の高さを固定して、単位の無いカードとも高さを揃える */}
        {isDone ? (
          <Text
            className="text-[11px] font-semibold text-teal-700 h-4"
            numberOfLines={1}
          >
            {doneLabel}
          </Text>
        ) : (
          <Text
            className="text-[11px] text-gray-400 dark:text-gray-500 h-4"
            numberOfLines={1}
          >
            {activity.quantityUnit}
          </Text>
        )}
      </TouchableOpacity>
      {/* Edit button */}
      <TouchableOpacity
        className="absolute top-0 right-0 p-2"
        onPress={onEdit}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Edit"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Pencil size={11} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
