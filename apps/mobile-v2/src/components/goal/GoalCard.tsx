import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
  Trophy,
  TrendingUp,
} from "lucide-react-native";
import dayjs from "dayjs";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import {
  generateDailyRecords,
  calculateGoalStats,
} from "@packages/domain/goal/goalStats";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useLiveQuery } from "../../db/useLiveQuery";
import { getDatabase } from "../../db/database";

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
        <View className="bg-white rounded-b-2xl">
          <GoalStatsDetail goal={goal} activity={activity} />
        </View>
      )}
    </View>
  );
}

// --- GoalStatsDetail (expanded panel) ---

function GoalStatsDetail({
  goal,
  activity,
}: {
  goal: GoalForCard;
  activity: ActivityRecord | null;
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const endDate = goal.endDate || today;
  const actualEndDate = endDate < today ? endDate : today;

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

  const statsData = useMemo(() => {
    if (!periodLogs) return null;
    const dailyRecords = generateDailyRecords(goal, periodLogs, today);
    const stats = calculateGoalStats(dailyRecords);
    return { dailyRecords, stats };
  }, [periodLogs, goal, today]);

  const unit = activity?.quantityUnit ?? "";

  if (!statsData) {
    return (
      <View className="px-4 pb-4 py-6 flex-row items-center justify-center">
        <Loader2 size={16} color="#9ca3af" />
        <Text className="ml-2 text-xs text-gray-400">統計を読み込み中...</Text>
      </View>
    );
  }

  const totalDays = statsData.dailyRecords.length;
  const achieveRate =
    totalDays > 0 ? (statsData.stats.achievedDays / totalDays) * 100 : 0;

  return (
    <View className="px-4 pb-4 border-t border-gray-100">
      {/* Stats grid (2 columns) */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        <StatCard
          icon={<Calendar size={14} color="#6b7280" />}
          label="活動日数"
          value={`${statsData.stats.activeDays}日`}
          sub={`/ ${totalDays}日`}
        />
        <StatCard
          icon={<Trophy size={14} color="#6b7280" />}
          label="達成日数"
          value={`${statsData.stats.achievedDays}日`}
          sub={`${achieveRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Flame size={14} color="#6b7280" />}
          label="最大連続日数"
          value={`${statsData.stats.maxConsecutiveDays}日`}
        />
        <StatCard
          icon={<TrendingUp size={14} color="#6b7280" />}
          label="平均活動量"
          value={`${statsData.stats.average}${unit}`}
        />
        <StatCard
          icon={<BarChart3 size={14} color="#6b7280" />}
          label="最大活動量"
          value={`${statsData.stats.max}${unit}`}
        />
      </View>

      {/* Daily records heatmap (last 14 days) */}
      {statsData.dailyRecords.length > 0 && (
        <View className="mt-3">
          <Text className="text-xs font-medium text-gray-500 mb-1.5">
            直近の記録
          </Text>
          <View className="flex-row gap-1">
            {statsData.dailyRecords.slice(-14).map((record) => (
              <View
                key={record.date}
                className={`flex-1 h-6 rounded-sm ${
                  record.achieved
                    ? "bg-green-400"
                    : record.quantity > 0
                      ? "bg-yellow-300"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-[10px] text-gray-400">
              {dayjs(statsData.dailyRecords.slice(-14)[0]?.date).format("M/D")}
            </Text>
            <Text className="text-[10px] text-gray-400">
              {dayjs(
                statsData.dailyRecords[statsData.dailyRecords.length - 1]?.date,
              ).format("M/D")}
            </Text>
          </View>
          {/* Legend */}
          <View className="flex-row gap-3 mt-1">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-green-400" />
              <Text className="text-[10px] text-gray-400">達成</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-yellow-300" />
              <Text className="text-[10px] text-gray-400">活動あり</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-gray-200" />
              <Text className="text-[10px] text-gray-400">未活動</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View className="bg-gray-50 rounded-lg p-2.5" style={{ width: "48%" }}>
      <View className="flex-row items-center gap-1.5 mb-1">
        {icon}
        <Text className="text-[10px] text-gray-500">{label}</Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-sm font-bold text-gray-900">{value}</Text>
        {sub && <Text className="text-[10px] text-gray-400">{sub}</Text>}
      </View>
    </View>
  );
}
