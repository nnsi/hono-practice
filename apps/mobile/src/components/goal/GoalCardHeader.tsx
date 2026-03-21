import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import dayjs from "dayjs";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";

type GoalForCard = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
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
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onHandleDelete: () => void;
}) {
  return (
    <TouchableOpacity
      className="w-full px-4 py-3"
      onPress={onToggleExpand}
      activeOpacity={0.7}
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
              className="flex-1 font-semibold text-sm text-gray-900"
              style={{ minWidth: 80 }}
            >
              {activity?.name ?? "不明なアクティビティ"}
            </Text>
            <View className="flex-row items-center gap-1 shrink-0">
              <Text className={`text-[11px] font-medium ${balanceColor}`}>
                {localBalance < 0 ? "-" : "+"}
                {Math.abs(localBalance).toLocaleString()}
                <Text className="text-[10px]">
                  {" "}
                  {activity?.quantityUnit ?? ""}
                </Text>
                {debtCapped && (
                  <Text className="text-[9px] text-orange-500"> (上限)</Text>
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
              <Text
                className={`text-[10px] font-medium ${statusBadge.textClass}`}
              >
                {statusBadge.label}
              </Text>
            </View>
            {isCurrentlyFrozen && (
              <View className="rounded-full px-2 py-0.5 shrink-0 bg-blue-100">
                <Text className="text-[10px] font-medium text-blue-700">
                  {"\u23F8"} 一時停止中
                </Text>
              </View>
            )}
            <Text className="text-xs text-gray-500 shrink-0">
              {goal.dailyTargetQuantity.toLocaleString()}
              {activity?.quantityUnit ?? ""}/日
            </Text>
            <Text className="text-xs text-gray-300 shrink-0">|</Text>
            <Text className="text-xs text-gray-500 shrink-0">
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </Text>
            <View className="flex-1" />
            {!isPast && onRecordOpen && (
              <TouchableOpacity className="p-1" onPress={onRecordOpen}>
                <PlusCircle size={14} color="#3b82f6" />
              </TouchableOpacity>
            )}
            {!isPast && onEditStart && (
              <TouchableOpacity className="p-1" onPress={onEditStart}>
                <Pencil size={14} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {isPast && !showDeleteConfirm && onDelete && (
              <TouchableOpacity className="p-1" onPress={onDeleteConfirm}>
                <Trash2 size={14} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {isPast && showDeleteConfirm && (
              <View className="flex-row items-center gap-1">
                <TouchableOpacity
                  className="px-2 py-1 bg-red-500 rounded"
                  onPress={onHandleDelete}
                  disabled={deleting}
                >
                  <Text className="text-xs text-white">削除</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-2 py-1 border border-gray-300 rounded"
                  onPress={onDeleteCancel}
                >
                  <Text className="text-xs text-gray-600">取消</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
