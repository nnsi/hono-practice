import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Calendar,
  TrendingUp,
  Flame,
  Trophy,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { DexieActivity } from "../../db/schema";
import type { GoalStats } from "./types";
import { fetchGoalStats } from "../../api/goalApi";

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
  goalId,
  activity,
}: {
  goalId: string;
  activity: DexieActivity | undefined;
}) {
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGoalStats(goalId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (loading) {
    return (
      <div className="px-4 pb-4 flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <span className="ml-2 text-xs text-gray-400">統計を読み込み中...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 pb-4 text-xs text-gray-400 text-center py-4">
        統計の取得に失敗しました
      </div>
    );
  }

  const unit = activity?.quantityUnit ?? "";
  const totalDays = stats.dailyRecords.length;
  const activeDays = stats.dailyRecords.filter((r) => r.quantity > 0).length;
  const achieveRate = totalDays > 0 ? (stats.stats.achievedDays / totalDays) * 100 : 0;

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

      {/* 直近の日次記録(最新7日分) */}
      {stats.dailyRecords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">直近の記録</p>
          <div className="flex gap-1">
            {stats.dailyRecords
              .slice(-14)
              .map((record) => (
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
            <span>{dayjs(stats.dailyRecords.slice(-14)[0]?.date).format("M/D")}</span>
            <span>{dayjs(stats.dailyRecords[stats.dailyRecords.length - 1]?.date).format("M/D")}</span>
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
