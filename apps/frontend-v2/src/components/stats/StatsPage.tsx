import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { ActivityStatCard } from "./ActivityStatCard";
import { useStatsPage } from "./useStatsPage";

export function StatsPage() {
  const {
    month,
    goToPrevMonth,
    goToNextMonth,
    isLoading,
    stats,
    allDates,
    getGoalLinesForActivity,
  } = useStatsPage();

  return (
    <div className="bg-white min-h-full">
      {/* Month navigation header */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-center gap-3 px-4 h-12">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-base font-medium min-w-[100px] text-center">
            {dayjs(month).format("YYYY年M月")}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-gray-400 py-16">
            <div className="animate-pulse">読み込み中...</div>
          </div>
        ) : !stats || stats.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">データがありません</p>
            <p className="text-sm">
              {dayjs(month).format("YYYY年M月")}
              のアクティビティ記録はありません
            </p>
          </div>
        ) : (
          stats.map((stat) => (
            <ActivityStatCard
              key={stat.id}
              stat={stat}
              allDates={allDates}
              month={month}
              goalLines={getGoalLinesForActivity(stat.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
