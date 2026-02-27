import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react-native";
import dayjs from "dayjs";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import { useLiveQuery } from "../../db/useLiveQuery";
import { getDatabase } from "../../db/database";
import type { Activity, UpdateGoalPayload } from "./types";

type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

type StatusBadge = { label: string; bgClass: string; textClass: string };

function getStatusBadge(
  goal: GoalForCard,
  hasTodayLog: boolean,
  balance: number,
): StatusBadge {
  if (!goal.isActive) {
    return {
      label: "終了",
      bgClass: "bg-gray-200",
      textClass: "text-gray-600",
    };
  }
  if (balance < 0) {
    return {
      label: "負債あり",
      bgClass: "bg-red-100",
      textClass: "text-red-700",
    };
  }
  if (hasTodayLog) {
    return {
      label: "順調",
      bgClass: "bg-green-100",
      textClass: "text-green-700",
    };
  }
  return {
    label: "達成ペース",
    bgClass: "bg-green-50",
    textClass: "text-green-600",
  };
}

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
  activity: Activity | null;
  isExpanded: boolean;
  isPast?: boolean;
  onToggleExpand: () => void;
  onEditStart?: () => void;
  onDelete?: () => Promise<void>;
  onRecordOpen?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const actualEndDate =
    goal.endDate && goal.endDate < today ? goal.endDate : today;

  const totalDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
    return Math.max(end.diff(start, "day") + 1, 1);
  }, [goal.startDate, goal.endDate]);

  // Today's log count
  const todayLogCount = useLiveQuery(
    ["activity_logs"],
    async () => {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM activity_logs
         WHERE activity_id = ? AND date = ? AND deleted_at IS NULL`,
        [goal.activityId, today],
      );
      return row?.cnt ?? 0;
    },
    [goal.activityId, today],
  );
  const hasTodayLog = (todayLogCount ?? 0) > 0;

  // Period logs for balance calculation
  const periodLogs = useLiveQuery(
    ["activity_logs"],
    async () => {
      const db = await getDatabase();
      return db.getAllAsync<{ date: string; quantity: number | null }>(
        `SELECT date, quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
        [goal.activityId, goal.startDate, actualEndDate],
      );
    },
    [goal.activityId, goal.startDate, actualEndDate],
  );

  const balance = useMemo(() => {
    return calculateGoalBalance(goal, periodLogs ?? [], today);
  }, [goal, periodLogs, today]);

  const localBalance = balance.currentBalance;
  const elapsedDays = balance.daysActive;

  const progressPercent = useMemo(() => {
    if (totalDays === 0) return 0;
    return Math.min((elapsedDays / totalDays) * 100, 100);
  }, [elapsedDays, totalDays]);

  const statusBadge = getStatusBadge(goal, hasTodayLog, localBalance);
  const balanceColor = localBalance < 0 ? "text-red-600" : "text-blue-600";

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

  return (
    <View
      className={`rounded-2xl mb-3 overflow-hidden ${
        isPast
          ? "border border-gray-200 bg-gray-50 opacity-75"
          : "border border-gray-200 bg-white"
      }`}
      style={
        isPast
          ? undefined
          : {
              shadowColor: "#1c1917",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
            }
      }
    >
      {/* Card header */}
      <TouchableOpacity
        className="w-full px-4 py-3 flex-row items-center gap-3"
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        {/* Activity emoji */}
        <Text className="text-2xl">{activity?.emoji ?? "🎯"}</Text>

        {/* Main info */}
        <View className="flex-1" style={{ minWidth: 0 }}>
          <View className="flex-row items-center gap-2">
            <Text
              className="font-semibold text-sm text-gray-900"
              numberOfLines={1}
            >
              {activity?.name ?? "不明なアクティビティ"}
            </Text>
            <View className={`rounded-full px-2 py-0.5 ${statusBadge.bgClass}`}>
              <Text className={`text-[10px] font-medium ${statusBadge.textClass}`}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-xs text-gray-500">
              {goal.dailyTargetQuantity.toLocaleString()}
              {activity?.quantityUnit ?? ""}/日
            </Text>
            <Text className="text-xs text-gray-300">|</Text>
            <Text className="text-xs text-gray-500">
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </Text>
          </View>
        </View>

        {/* Right side */}
        <View className="flex-row items-center gap-1">
          <Text className={`text-xs font-medium ${balanceColor}`}>
            {localBalance < 0 ? "-" : "+"}
            {Math.abs(localBalance).toLocaleString()}
            {activity?.quantityUnit ? ` ${activity.quantityUnit}` : ""}
          </Text>

          {!isPast && onRecordOpen && (
            <TouchableOpacity
              className="p-1.5"
              onPress={onRecordOpen}
            >
              <PlusCircle size={14} color="#3b82f6" />
            </TouchableOpacity>
          )}

          {!isPast && onEditStart && (
            <TouchableOpacity
              className="p-1.5"
              onPress={onEditStart}
            >
              <Pencil size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {isPast && !showDeleteConfirm && onDelete && (
            <TouchableOpacity
              className="p-1.5"
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {isPast && showDeleteConfirm && (
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                className="px-2 py-1 bg-red-500 rounded"
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text className="text-xs text-white">削除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-2 py-1 border border-gray-300 rounded"
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text className="text-xs text-gray-600">取消</Text>
              </TouchableOpacity>
            </View>
          )}

          {isExpanded ? (
            <ChevronUp size={16} color="#9ca3af" />
          ) : (
            <ChevronDown size={16} color="#9ca3af" />
          )}
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View className="px-4 pb-2">
        <View className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <View
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <View className="flex-row justify-between mt-0.5">
          <Text className="text-[10px] text-gray-400">
            {elapsedDays}日経過
          </Text>
          <Text className="text-[10px] text-gray-400">
            全{totalDays}日
          </Text>
        </View>
      </View>

      {/* Expanded detail */}
      {isExpanded && (
        <View className="bg-white px-4 py-3 border-t border-gray-100">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-gray-500">目標合計</Text>
            <Text className="text-xs text-gray-700">
              {balance.totalTarget.toLocaleString()}
              {activity?.quantityUnit ?? ""}
            </Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-gray-500">実績合計</Text>
            <Text className="text-xs text-gray-700">
              {balance.totalActual.toLocaleString()}
              {activity?.quantityUnit ?? ""}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-500">残高</Text>
            <Text className={`text-xs font-medium ${balanceColor}`}>
              {localBalance < 0 ? "-" : "+"}
              {Math.abs(localBalance).toLocaleString()}
              {activity?.quantityUnit ? ` ${activity.quantityUnit}` : ""}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
