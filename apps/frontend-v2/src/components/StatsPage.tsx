import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { apiFetch } from "../utils/apiClient";

// --- Types ---

type StatsKindLog = {
  date: string;
  quantity: number;
};

type StatsKind = {
  id: string | null;
  name: string;
  color: string | null | undefined;
  total: number;
  logs: StatsKindLog[];
};

type ActivityStat = {
  id: string;
  name: string;
  total: number | null;
  quantityUnit: string;
  showCombinedStats: boolean;
  kinds: StatsKind[];
};

type GoalData = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
};

type GoalLine = {
  id: string;
  value: number;
  label: string;
  color: string;
};

type ChartData = {
  date: string;
  [key: string]: string | number;
};

// --- Color utilities ---

const COLOR_PALETTE = [
  "#0173B2",
  "#DE8F05",
  "#029E73",
  "#D55E00",
  "#CC79A7",
  "#F0E442",
  "#56B4E9",
  "#999999",
  "#7570B3",
  "#1B9E77",
];

const DEFAULT_BAR_COLOR = "#3b82f6";

function getUniqueColorForKind(
  kindName: string,
  usedColors: Set<string>,
): string {
  let hash = 0;
  for (let i = 0; i < kindName.length; i++) {
    const char = kindName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const initialIndex = Math.abs(hash) % COLOR_PALETTE.length;

  if (!usedColors.has(COLOR_PALETTE[initialIndex])) {
    return COLOR_PALETTE[initialIndex];
  }

  for (const color of COLOR_PALETTE) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  return COLOR_PALETTE[initialIndex];
}

// --- Quantity formatting ---

function formatQuantityWithUnit(quantity: number, unit: string): string {
  if (unit === "時間" || unit === "hour" || unit === "hours") {
    const hours = Math.floor(quantity);
    const minutes = Math.round((quantity - hours) * 60);
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded}${unit}`;
}

// --- Main StatsPage component ---

export function StatsPage() {
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [stats, setStats] = useState<ActivityStat[] | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).subtract(1, "month").format("YYYY-MM"));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).add(1, "month").format("YYYY-MM"));
  }, []);

  // Fetch stats
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const res = await apiFetch(
        `/users/activity-logs/stats?date=${month}`,
      );
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats([]);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

  // Fetch goals (best-effort, non-blocking)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await apiFetch("/users/goals");
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        // API returns { goals: GoalData[] } or GoalData[]
        setGoals(Array.isArray(data) ? data : data.goals ?? []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getGoalLinesForActivity = useCallback(
    (activityId: string): GoalLine[] => {
      if (!goals.length) return [];

      const monthStart = dayjs(month).startOf("month");
      const monthEnd = dayjs(month).endOf("month");

      const relevant = goals.filter((goal) => {
        if (goal.activityId !== activityId) return false;
        const goalStart = dayjs(goal.startDate);
        const goalEnd = goal.endDate ? dayjs(goal.endDate) : null;
        if (goalEnd?.isBefore(monthStart)) return false;
        if (goalStart.isAfter(monthEnd)) return false;
        return true;
      });

      return relevant.map((goal, i) => ({
        id: goal.id,
        value: goal.dailyTargetQuantity,
        label: `目標${relevant.length > 1 ? i + 1 : ""}: ${goal.dailyTargetQuantity}`,
        color: "#ff6b6b",
      }));
    },
    [goals, month],
  );

  const allDates = useMemo(() => {
    const start = dayjs(`${month}-01`);
    const days = start.daysInMonth();
    return Array.from({ length: days }, (_, i) =>
      start.add(i, "day").format("YYYY-MM-DD"),
    );
  }, [month]);

  return (
    <div className="bg-white min-h-full">
      {/* Month navigation header */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-medium min-w-[100px] text-center">
            {dayjs(month).format("YYYY年M月")}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} />
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

// --- Activity stat card ---

function ActivityStatCard({
  stat,
  allDates,
  month,
  goalLines,
}: {
  stat: ActivityStat;
  allDates: string[];
  month: string;
  goalLines: GoalLine[];
}) {
  // Build color map for kinds
  const kindColors = useMemo(() => {
    const usedColors = new Set<string>();
    const colorMap: Record<string, string> = {};
    for (const kind of stat.kinds) {
      const color =
        kind.color || getUniqueColorForKind(kind.name, usedColors);
      usedColors.add(color);
      colorMap[kind.name] = color;
    }
    return colorMap;
  }, [stat.kinds]);

  // Build chart data: all days of month with kind quantities
  const chartData: ChartData[] = useMemo(() => {
    return allDates.map((date) => {
      const kindsData: Record<string, number> = {};
      for (const kind of stat.kinds) {
        const matchingLogs = kind.logs.filter(
          (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
        );
        kindsData[kind.name] =
          Math.round(
            matchingLogs.reduce((sum, l) => sum + l.quantity, 0) * 100,
          ) / 100;
      }
      return {
        date: `${dayjs(date).date()}日`,
        ...kindsData,
      };
    });
  }, [allDates, stat.kinds]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalQuantity = stat.kinds.reduce((sum, k) => sum + k.total, 0);
    const activeDays = new Set(
      stat.kinds.flatMap((k) =>
        k.logs.filter((l) => l.quantity > 0).map((l) => l.date),
      ),
    ).size;
    const daysInMonth = allDates.length;
    const avgPerDay =
      activeDays > 0
        ? Math.round((totalQuantity / activeDays) * 100) / 100
        : 0;

    return { totalQuantity, activeDays, daysInMonth, avgPerDay };
  }, [stat.kinds, allDates]);

  const isSingleUnnamedKind =
    stat.kinds.length === 1 && stat.kinds[0].name === "未指定";

  return (
    <div className="border rounded-xl overflow-hidden bg-gray-50">
      {/* Activity header */}
      <div className="px-4 py-3 bg-white border-b">
        <h2 className="text-lg font-bold">
          {stat.name}
          {stat.showCombinedStats && stat.total != null && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              合計: {formatQuantityWithUnit(stat.total, stat.quantityUnit)}
            </span>
          )}
        </h2>
      </div>

      {/* Kind summary cards (only if multiple kinds or named kinds) */}
      {!isSingleUnnamedKind && (
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stat.kinds.map((kind) => (
              <div
                key={kind.id || kind.name}
                className="bg-white rounded-lg p-3 border shadow-sm"
              >
                <div className="text-xs text-gray-500 mb-0.5">
                  {kind.name}
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: kindColors[kind.name] }}
                >
                  {formatQuantityWithUnit(kind.total, stat.quantityUnit)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {stat.showCombinedStats ? (
          <ActivityChart
            data={chartData}
            dataKeys={stat.kinds.map((k) => ({
              name: k.name,
              color: kindColors[k.name],
            }))}
            stackId="a"
            showLegend={!isSingleUnnamedKind}
            goalLines={goalLines}
          />
        ) : stat.kinds.length === 1 ? (
          <ActivityChart
            data={chartData}
            dataKeys={[
              {
                name: stat.kinds[0].name,
                color: kindColors[stat.kinds[0].name] || DEFAULT_BAR_COLOR,
              },
            ]}
            showLegend={false}
            goalLines={goalLines}
          />
        ) : (
          <div className="space-y-4">
            {stat.kinds.map((kind) => {
              const kindData = allDates.map((date) => {
                const matchingLogs = kind.logs.filter(
                  (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
                );
                return {
                  date: `${dayjs(date).date()}日`,
                  [kind.name]:
                    Math.round(
                      matchingLogs.reduce((sum, l) => sum + l.quantity, 0) *
                        100,
                    ) / 100,
                };
              });
              return (
                <div key={kind.id || kind.name}>
                  <h4 className="font-semibold text-sm mb-1 px-1">
                    {kind.name}
                    <span className="text-gray-400 font-normal ml-1">
                      (合計:{" "}
                      {formatQuantityWithUnit(kind.total, stat.quantityUnit)})
                    </span>
                  </h4>
                  <ActivityChart
                    data={kindData}
                    dataKeys={[
                      {
                        name: kind.name,
                        color: kindColors[kind.name] || DEFAULT_BAR_COLOR,
                      },
                    ]}
                    height={220}
                    showLegend={false}
                    goalLines={goalLines}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <SummarySection
        summary={summary}
        quantityUnit={stat.quantityUnit}
      />

      {/* Collapsible daily/weekly table */}
      <SummaryTable
        quantityUnit={stat.quantityUnit}
        data={chartData}
        kinds={stat.kinds}
        kindColors={kindColors}
        month={month}
      />
    </div>
  );
}

// --- Chart component ---

function ActivityChart({
  data,
  dataKeys,
  height = 280,
  stackId,
  showLegend = true,
  goalLines = [],
}: {
  data: ChartData[];
  dataKeys: { name: string; color: string }[];
  height?: number;
  stackId?: string;
  showLegend?: boolean;
  goalLines?: GoalLine[];
}) {
  return (
    <div className="bg-white rounded-lg p-3 border">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
          {dataKeys.map((key) => (
            <Bar
              key={key.name}
              dataKey={key.name}
              fill={key.color}
              name={key.name}
              stackId={stackId}
              radius={[2, 2, 0, 0]}
            />
          ))}
          {goalLines.map((goal) => (
            <ReferenceLine
              key={`goal-${goal.id}`}
              y={goal.value}
              stroke={goal.color}
              strokeDasharray="5 5"
              label={{
                value: goal.label,
                position: "right",
                fill: goal.color,
                fontSize: 11,
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Summary section ---

function SummarySection({
  summary,
  quantityUnit,
}: {
  summary: {
    totalQuantity: number;
    activeDays: number;
    daysInMonth: number;
    avgPerDay: number;
  };
  quantityUnit: string;
}) {
  return (
    <div className="px-4 pb-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-lg p-3 border text-center">
          <div className="text-xs text-gray-500 mb-0.5">合計</div>
          <div className="text-sm font-bold">
            {formatQuantityWithUnit(summary.totalQuantity, quantityUnit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border text-center">
          <div className="text-xs text-gray-500 mb-0.5">日平均</div>
          <div className="text-sm font-bold">
            {formatQuantityWithUnit(summary.avgPerDay, quantityUnit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border text-center">
          <div className="text-xs text-gray-500 mb-0.5">記録日数</div>
          <div className="text-sm font-bold">
            {summary.activeDays}
            <span className="text-xs font-normal text-gray-400">
              /{summary.daysInMonth}日
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Collapsible daily/weekly summary table ---

function SummaryTable({
  quantityUnit,
  data,
  kinds,
  kindColors,
  month,
}: {
  quantityUnit: string;
  data: ChartData[];
  kinds: StatsKind[];
  kindColors: Record<string, string>;
  month: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group data by week
  const weeks = useMemo(() => {
    type DayEntry = {
      date: string;
      dayOfWeek: string;
      total: number;
      breakdown: Record<string, number>;
    };
    type WeekEntry = {
      weekStart: dayjs.Dayjs;
      days: DayEntry[];
      weekTotal: number;
    };

    const weekMap: Record<string, WeekEntry> = {};

    for (const day of data) {
      const dayNumber = Number.parseInt(
        (day.date as string).replace("日", ""),
        10,
      );
      const dateObj = dayjs(month).date(dayNumber);
      const weekKey = dateObj.startOf("week").format("YYYY-MM-DD");

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: dateObj.startOf("week"),
          days: [],
          weekTotal: 0,
        };
      }

      const dayTotal = kinds.reduce((sum, kind) => {
        return sum + (Number(day[kind.name]) || 0);
      }, 0);
      const roundedTotal = Math.round(dayTotal * 1000) / 1000;

      const breakdown: Record<string, number> = {};
      for (const kind of kinds) {
        breakdown[kind.name] = Number(day[kind.name]) || 0;
      }

      weekMap[weekKey].days.push({
        date: dateObj.format("MM/DD"),
        dayOfWeek: dateObj.format("ddd"),
        total: roundedTotal,
        breakdown,
      });

      weekMap[weekKey].weekTotal += roundedTotal;
    }

    return Object.values(weekMap).sort(
      (a, b) => a.weekStart.valueOf() - b.weekStart.valueOf(),
    );
  }, [data, kinds, month]);

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-sm">日別・週別 合計値</span>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  日付
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  日合計
                </th>
                {kinds.length > 1 &&
                  kinds.map((kind) => (
                    <th
                      key={kind.name}
                      className="hidden md:table-cell px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                    >
                      {kind.name}
                    </th>
                  ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  週合計
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {weeks.map((week) =>
                week.days.map((day, dayIndex) => (
                  <tr
                    key={`${day.date}-${day.dayOfWeek}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-900">
                      {day.date} ({day.dayOfWeek})
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right font-medium">
                      {day.total > 0
                        ? formatQuantityWithUnit(day.total, quantityUnit)
                        : "-"}
                    </td>
                    {kinds.length > 1 &&
                      kinds.map((kind) => (
                        <td
                          key={kind.name}
                          className="hidden md:table-cell px-3 py-1.5 whitespace-nowrap text-right"
                          style={{ color: kindColors[kind.name] }}
                        >
                          {day.breakdown[kind.name] || "-"}
                        </td>
                      ))}
                    {dayIndex === 0 && (
                      <td
                        className="px-3 py-1.5 whitespace-nowrap text-right font-bold bg-gray-50"
                        rowSpan={week.days.length}
                      >
                        {formatQuantityWithUnit(
                          Math.round(week.weekTotal * 1000) / 1000,
                          quantityUnit,
                        )}
                      </td>
                    )}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
