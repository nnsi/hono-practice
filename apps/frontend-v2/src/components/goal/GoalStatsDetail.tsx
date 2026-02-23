import { useMemo } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  TrendingUp,
  Flame,
  Trophy,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import type { Goal } from "./types";

dayjs.extend(isSameOrBefore);

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
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold">{value}</span>
        {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

export function GoalStatsDetail({
  goal,
  activity,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const endDate = goal.endDate || today;
  const actualEndDate = endDate < today ? endDate : today;

  const logs = useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .between(goal.startDate, actualEndDate, true, true)
        .filter(
          (log) => log.activityId === goal.activityId && !log.deletedAt,
        )
        .toArray(),
    [goal.activityId, goal.startDate, actualEndDate],
  );

  const stats = useMemo(() => {
    if (!logs) return null;

    // 日付ごとに数量を集計
    const dateMap = new Map<string, number>();
    for (const log of logs) {
      const qty = log.quantity ?? 0;
      dateMap.set(log.date, (dateMap.get(log.date) ?? 0) + qty);
    }

    // 期間内の全日の日次記録を生成
    const dailyRecords: {
      date: string;
      quantity: number;
      achieved: boolean;
    }[] = [];
    let current = dayjs(goal.startDate);
    const end = dayjs(actualEndDate);
    while (current.isSameOrBefore(end)) {
      const dateStr = current.format("YYYY-MM-DD");
      const quantity = dateMap.get(dateStr) ?? 0;
      dailyRecords.push({
        date: dateStr,
        quantity,
        achieved: quantity >= goal.dailyTargetQuantity,
      });
      current = current.add(1, "day");
    }

    // 活動があった日のみで平均・最大を計算
    const activeQuantities = dailyRecords
      .filter((r) => r.quantity > 0)
      .map((r) => r.quantity);
    const total = activeQuantities.reduce((sum, q) => sum + q, 0);
    const average =
      activeQuantities.length > 0
        ? Math.round((total / activeQuantities.length) * 10) / 10
        : 0;
    const max =
      activeQuantities.length > 0 ? Math.max(...activeQuantities) : 0;
    const achievedDays = dailyRecords.filter((r) => r.achieved).length;

    // 最大連続活動日数
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let lastDate: dayjs.Dayjs | null = null;
    for (const record of dailyRecords) {
      if (record.quantity > 0) {
        const d = dayjs(record.date);
        if (lastDate === null || d.diff(lastDate, "day") === 1) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
        lastDate = d;
      } else {
        currentConsecutive = 0;
        lastDate = null;
      }
    }

    return {
      dailyRecords,
      stats: {
        average,
        max,
        maxConsecutiveDays: maxConsecutive,
        achievedDays,
      },
    };
  }, [logs, goal.startDate, actualEndDate, goal.dailyTargetQuantity]);

  if (!stats) {
    return (
      <div className="px-4 pb-4 flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <span className="ml-2 text-xs text-gray-400">統計を読み込み中...</span>
      </div>
    );
  }

  const unit = activity?.quantityUnit ?? "";
  const totalDays = stats.dailyRecords.length;
  const activeDays = stats.dailyRecords.filter((r) => r.quantity > 0).length;
  const achieveRate =
    totalDays > 0 ? (stats.stats.achievedDays / totalDays) * 100 : 0;

  return (
    <div className="px-4 pb-4 border-t border-gray-100">
      {/* 統計グリッド */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <StatCard
          icon={<Calendar size={14} />}
          label="活動日数"
          value={`${activeDays}日`}
          sub={`/ ${totalDays}日`}
        />
        <StatCard
          icon={<Trophy size={14} />}
          label="達成日数"
          value={`${stats.stats.achievedDays}日`}
          sub={`${achieveRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Flame size={14} />}
          label="最大連続日数"
          value={`${stats.stats.maxConsecutiveDays}日`}
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="平均活動量"
          value={`${stats.stats.average}${unit}`}
        />
        <StatCard
          icon={<BarChart3 size={14} />}
          label="最大活動量"
          value={`${stats.stats.max}${unit}`}
        />
      </div>

      {/* 直近の日次記録(最新14日分) */}
      {stats.dailyRecords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            直近の記録
          </p>
          <div className="flex gap-1">
            {stats.dailyRecords.slice(-14).map((record) => (
              <div
                key={record.date}
                className={`flex-1 h-6 rounded-sm ${
                  record.achieved
                    ? "bg-green-400"
                    : record.quantity > 0
                      ? "bg-yellow-300"
                      : "bg-gray-200"
                }`}
                title={`${record.date}: ${record.quantity}${unit}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>
              {dayjs(stats.dailyRecords.slice(-14)[0]?.date).format("M/D")}
            </span>
            <span>
              {dayjs(
                stats.dailyRecords[stats.dailyRecords.length - 1]?.date,
              ).format("M/D")}
            </span>
          </div>
          <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-green-400" />
              達成
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-300" />
              活動あり
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-gray-200" />
              未活動
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
