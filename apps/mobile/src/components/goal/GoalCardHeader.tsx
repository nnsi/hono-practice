import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";
import { GoalCardActions } from "./GoalCardActions";

type GoalForCard = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

type StatusBadge = { label: string; bgClass: string; textClass: string };

type IconBlob = {
  base64: string;
  mimeType: string;
};

export function GoalCardHeader({
  goal,
  activity,
  iconBlob,
  isExpanded,
  isPast,
  localBalance,
  debtCapped,
  balanceColor,
  statusBadge,
  isCurrentlyFrozen,
  showDeleteConfirm,
  deleting,
  onToggleExpand,
  onEditStart,
  onDelete,
  onRecordOpen,
  onDeactivate,
  onDeleteConfirm,
  onDeleteCancel,
  onHandleDelete,
}: {
  goal: GoalForCard;
  activity: ActivityRecord | null;
  iconBlob?: IconBlob;
  isExpanded: boolean;
  isPast: boolean;
  localBalance: number;
  debtCapped: boolean;
  balanceColor: string;
  statusBadge: StatusBadge;
  isCurrentlyFrozen: boolean;
  showDeleteConfirm: boolean;
  deleting: boolean;
  onToggleExpand: () => void;
  onEditStart?: () => void;
  onDelete?: () => Promise<void>;
  onRecordOpen?: () => void;
  onDeactivate?: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onHandleDelete: () => void;
}) {
  const { t } = useTranslation("goal");
  return (
    <TouchableOpacity
      className="w-full px-4 py-3"
      onPress={onToggleExpand}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      accessibilityLabel={`${activity?.name ?? "目標"} ${isExpanded ? "折りたたむ" : "展開する"}`}
    >
      <View className="flex-row gap-3 items-start">
        <ActivityIcon
          iconType={activity?.iconType}
          emoji={activity?.emoji ?? "\u{1F3AF}"}
          iconBlob={iconBlob}
          iconUrl={activity?.iconUrl}
          iconThumbnailUrl={activity?.iconThumbnailUrl}
        />
        <View className="flex-1" style={{ minWidth: 0 }}>
          <View className="flex-row items-start gap-2">
            <Text
              className="flex-1 font-semibold text-sm text-gray-900 dark:text-gray-100"
              style={{ minWidth: 80 }}
            >
              {activity?.name ?? "不明なアクティビティ"}
            </Text>
            <View className="flex-row items-center gap-1 shrink-0">
              <Text className={`text-xs font-medium ${balanceColor}`}>
                {localBalance < 0 ? "-" : "+"}
                {Math.abs(localBalance).toLocaleString()}
                <Text className="text-xs"> {activity?.quantityUnit ?? ""}</Text>
                {debtCapped && (
                  <Text className="text-xs text-orange-500"> (上限)</Text>
                )}
              </Text>
              {isExpanded ? (
                <ChevronUp size={16} color="#9ca3af" />
              ) : (
                <ChevronDown size={16} color="#9ca3af" />
              )}
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
            <View
              className={`rounded-full px-2 py-0.5 shrink-0 ${statusBadge.bgClass}`}
            >
              <Text className={`text-xs font-medium ${statusBadge.textClass}`}>
                {statusBadge.label}
              </Text>
            </View>
            {isCurrentlyFrozen && (
              <View className="rounded-full px-2 py-0.5 shrink-0 bg-blue-100">
                <Text className="text-xs font-medium text-blue-700">
                  {"\u23F8"} 一時停止中
                </Text>
              </View>
            )}
            <Text className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {goal.dailyTargetQuantity.toLocaleString()}
              {activity?.quantityUnit ?? ""}/日
            </Text>
            <Text className="text-xs text-gray-300 shrink-0">|</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </Text>
            <View className="flex-1" />
            <GoalCardActions
              isPast={isPast}
              isActive={goal.isActive}
              showDeleteConfirm={showDeleteConfirm}
              deleting={deleting}
              onRecordOpen={onRecordOpen}
              onEditStart={onEditStart}
              onDeactivate={onDeactivate}
              onDeleteConfirm={onDeleteConfirm}
              onDeleteCancel={onDeleteCancel}
              onHandleDelete={onHandleDelete}
              onDelete={onDelete}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
