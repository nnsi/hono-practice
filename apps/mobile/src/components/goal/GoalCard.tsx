import { useState } from "react";

import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { FreezePeriodManager } from "./FreezePeriodManager";
import { GoalCardHeader } from "./GoalCardHeader";
import { GoalStatsDetail } from "./GoalStatsDetail";
import { useGoalCard } from "./useGoalCard";

type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
};

export function GoalCard({
  goal,
  activity,
  isExpanded,
  isPast = false,
  onToggleExpand,
  onEditStart,
  onDelete,
  onRecordOpen,
}: {
  goal: GoalForCard;
  activity: ActivityRecord | null;
  isExpanded: boolean;
  isPast?: boolean;
  onToggleExpand: () => void;
  onEditStart?: () => void;
  onDelete?: () => Promise<void>;
  onRecordOpen?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    totalDays,
    elapsedDays,
    localBalance,
    balance,
    isCurrentlyFrozen,
    completionPercent,
    progressPercent,
    showInactiveDatesEnabled,
    inactiveDates,
    statusBadge,
    balanceColor,
  } = useGoalCard(goal);

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const gradientColor = isPast
    ? null
    : localBalance > 0
      ? "rgba(34, 197, 94, 0.2)"
      : localBalance < 0
        ? "rgba(239, 68, 68, 0.2)"
        : "rgba(156, 163, 175, 0.2)";

  const shadowStyle = isPast
    ? undefined
    : {
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      };

  const stop = completionPercent / 100;

  const cardContent = (
    <>
      <GoalCardHeader
        goal={goal}
        activity={activity}
        isExpanded={isExpanded}
        isPast={isPast}
        localBalance={localBalance}
        debtCapped={balance.debtCapped}
        balanceColor={balanceColor}
        statusBadge={statusBadge}
        isCurrentlyFrozen={isCurrentlyFrozen}
        showDeleteConfirm={showDeleteConfirm}
        deleting={deleting}
        onToggleExpand={onToggleExpand}
        onEditStart={onEditStart}
        onDelete={onDelete}
        onRecordOpen={onRecordOpen}
        onDeleteConfirm={() => setShowDeleteConfirm(true)}
        onDeleteCancel={() => setShowDeleteConfirm(false)}
        onHandleDelete={handleDelete}
      />

      <View className="px-4 pb-2">
        <View className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <View
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <View className="flex-row justify-between mt-0.5">
          <Text className="text-[10px] text-gray-400">{elapsedDays}日経過</Text>
          <Text className="text-[10px] text-gray-400">全{totalDays}日</Text>
        </View>
      </View>

      {showInactiveDatesEnabled && inactiveDates.length > 0 && (
        <View className="mt-1 px-3 py-1">
          <Text className="text-xs text-gray-500">
            <Text className="font-medium">やらなかった日付: </Text>
            {inactiveDates.slice(0, 3).map((date, index) => (
              <Text key={date}>
                {index > 0 ? ", " : ""}
                {dayjs(date).format("M/D")}
              </Text>
            ))}
            {inactiveDates.length > 3 && (
              <Text> 他{inactiveDates.length - 3}日</Text>
            )}
          </Text>
        </View>
      )}

      {isExpanded && (
        <View className="bg-white rounded-b-2xl">
          <GoalStatsDetail goal={goal} activity={activity} />
          {!isPast && (
            <View className="px-4 pb-4">
              <FreezePeriodManager goalId={goal.id} />
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      className={`rounded-2xl mb-3 overflow-hidden ${
        isPast
          ? "border border-gray-200 bg-gray-50 opacity-75"
          : "border border-gray-200"
      }`}
      style={shadowStyle}
    >
      {gradientColor ? (
        <LinearGradient
          colors={[gradientColor, "white"]}
          locations={[stop, stop]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        >
          {cardContent}
        </LinearGradient>
      ) : (
        cardContent
      )}
    </View>
  );
}
