import { useState } from "react";

import {
  type GoalLine,
  getUniqueColorForKind,
  useActivityStats,
} from "@frontend/hooks/feature/activity/useActivityStats";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import dayjs from "dayjs";
import {
  Bar,
  BarChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// 共通のチャートコンポーネント
type ChartData = {
  date: string;
  [key: string]: string | number;
};

type ActivityChartProps = {
  data: ChartData[];
  dataKeys: { name: string; color: string }[];
  height?: number;
  stackId?: string;
  showLegend?: boolean;
  goalLines?: GoalLine[];
};

// 日別・週別の合計値テーブルコンポーネント
type SummaryTableProps = {
  quantityUnit: string;
  data: ChartData[];
  kinds: Array<{
    name: string;
  }>;
  kindColors: Record<string, string>;
  month: string;
};

const SummaryTable: React.FC<SummaryTableProps> = ({
  quantityUnit,
  data,
  kinds,
  kindColors,
  month,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 週ごとにデータをグループ化
  const weeklyData = data.reduce(
    (acc, day) => {
      // 月の日付を再構築（dataのdateは"1日", "2日"形式なので、渡された月を使って完全な日付を生成）
      const dayNumber = Number.parseInt(day.date.replace("日", ""), 10);
      const date = dayjs(month).date(dayNumber);
      const weekStart = date.startOf("week");
      const weekKey = weekStart.format("YYYY-MM-DD");

      if (!acc[weekKey]) {
        acc[weekKey] = {
          weekStart,
          days: [],
          weekTotal: 0,
        };
      }

      const dayTotal = kinds.reduce((sum, kind) => {
        return sum + (Number(day[kind.name]) || 0);
      }, 0);

      // 小数点第3位まで正確に丸める
      const roundedDayTotal = Math.round(dayTotal * 1000) / 1000;

      acc[weekKey].days.push({
        date: date.format("MM/DD"),
        dayOfWeek: date.format("ddd"),
        total: roundedDayTotal,
        breakdown: kinds.reduce(
          (breakdown, kind) => {
            breakdown[kind.name] = Number(day[kind.name]) || 0;
            return breakdown;
          },
          {} as Record<string, number>,
        ),
      });

      acc[weekKey].weekTotal += roundedDayTotal;

      return acc;
    },
    {} as Record<
      string,
      {
        weekStart: dayjs.Dayjs;
        days: Array<{
          date: string;
          dayOfWeek: string;
          total: number;
          breakdown: Record<string, number>;
        }>;
        weekTotal: number;
      }
    >,
  );

  const weeks = Object.values(weeklyData).sort(
    (a, b) => a.weekStart.valueOf() - b.weekStart.valueOf(),
  );

  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <h3 className="font-semibold">日別・週別 合計値</h3>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5" />
        ) : (
          <ChevronDownIcon className="h-5 w-5" />
        )}
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日付
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日合計
                </th>
                {kinds.length > 1 &&
                  kinds.map((kind) => (
                    <th
                      key={kind.name}
                      className="hidden md:table-cell px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {kind.name}
                    </th>
                  ))}
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  週合計
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weeks.map((week, _weekIndex) =>
                week.days.map((day, dayIndex) => (
                  <tr
                    key={`${day.date}-${day.dayOfWeek}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {day.date} ({day.dayOfWeek})
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium">
                      {day.total} {quantityUnit}
                    </td>
                    {kinds.length > 1 &&
                      kinds.map((kind) => (
                        <td
                          key={kind.name}
                          className="hidden md:table-cell px-4 py-2 whitespace-nowrap text-sm text-right"
                          style={{ color: kindColors[kind.name] }}
                        >
                          {day.breakdown[kind.name] || 0}
                        </td>
                      ))}
                    {dayIndex === 0 && (
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm text-right font-bold bg-gray-50"
                        rowSpan={week.days.length}
                      >
                        {Math.round(week.weekTotal * 1000) / 1000}{" "}
                        {quantityUnit}
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
};
const ActivityChart: React.FC<ActivityChartProps> = ({
  data,
  dataKeys,
  height = 300,
  stackId,
  showLegend = true,
  goalLines = [],
}) => {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {dataKeys.map((key) => (
            <Bar
              key={key.name}
              dataKey={key.name}
              fill={key.color}
              name={key.name}
              stackId={stackId}
            />
          ))}
          {goalLines.map((goal) => (
            <ReferenceLine
              key={`goal-${goal.id}`}
              y={goal.value}
              stroke={goal.color || "#ff0000"}
              strokeDasharray="5 5"
              label={{
                value: goal.label,
                position: "right",
                fill: goal.color || "#ff0000",
                fontSize: 12,
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ActivityStatsPage: React.FC = () => {
  const { stateProps, actions } = useActivityStats();
  const { month, stats, isLoading } = stateProps;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-3">
        <button type="button" onClick={actions.onPrevMonth} className="ml-1">
          <ChevronLeftIcon />
        </button>
        <span>{dayjs(month).format("YYYY年MM月")}</span>
        <button type="button" onClick={actions.onNextMonth}>
          <ChevronRightIcon />
        </button>
      </div>
      <hr className="my-6" />
      <div className="space-y-6">
        {stats?.map((stat) => {
          // 月の全日付を生成
          const allDates = actions.generateAllDatesForMonth();

          // 日付ごとに各kindの合計値を集計
          const data = allDates.map((date) => {
            const kindsData: Record<string, number> = {};
            stat.kinds.forEach((kind) => {
              const log = kind.logs.filter(
                (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
              );
              kindsData[kind.name] = log
                ? Math.round(
                    ((kindsData[kind.name] ?? 0) +
                      log.reduce((sum, l) => sum + l.quantity, 0)) *
                      100,
                  ) / 100
                : 0;
            });
            return {
              date: dayjs(date).format("D日"), // 横軸を日付（1,2,3...）で表示
              ...kindsData,
            };
          });

          // 各statごとに色の割り当てを管理
          const kindColors = (() => {
            const usedColors = new Set<string>();
            const colorMap: Record<string, string> = {};
            stat.kinds.forEach((kind) => {
              // 設定されている色があればそれを使用、なければ自動生成
              const color =
                kind.color || getUniqueColorForKind(kind.name, usedColors);
              usedColors.add(color);
              colorMap[kind.name] = color;
            });
            return colorMap;
          })();

          return (
            <div key={stat.id} className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-xl font-bold mb-4">
                {stat.name}
                {stat.showCombinedStats &&
                  ` (合計: ${stat.total} ${stat.quantityUnit})`}
              </h2>
              {!(
                stat.kinds.length === 1 && stat.kinds[0].name === "未指定"
              ) && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {stat.kinds.map((kind) => (
                      <div
                        key={kind.name}
                        className="bg-white rounded-lg p-4 border shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {kind.name}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{
                            color: kindColors[kind.name],
                          }}
                        >
                          {kind.total}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            {stat.quantityUnit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <hr className="my-6" />
                {stat.showCombinedStats ? (
                  <ActivityChart
                    data={data}
                    dataKeys={stat.kinds.map((kind) => ({
                      name: kind.name,
                      color: kindColors[kind.name],
                    }))}
                    stackId="a"
                    showLegend={stat.kinds[0].name !== "未指定"}
                    goalLines={actions.getGoalLinesForActivity(stat.id)}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {stat.kinds.map((kind) => {
                      // kindごとにデータを抽出
                      const kindData = allDates.map((date) => {
                        const log = kind.logs.filter(
                          (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
                        );
                        return {
                          date: dayjs(date).format("D日"),
                          [kind.name]: log
                            ? Math.round(
                                log.reduce((sum, l) => sum + l.quantity, 0) *
                                  100,
                              ) / 100
                            : 0,
                        };
                      });
                      return (
                        <div key={kind.id || kind.name}>
                          <h4 className="font-semibold mb-2">
                            {kind.name} (合計: {kind.total} {stat.quantityUnit})
                          </h4>
                          <ActivityChart
                            data={kindData}
                            dataKeys={[
                              {
                                name: kind.name,
                                color: kindColors[kind.name],
                              },
                            ]}
                            height={250}
                            showLegend={false}
                            goalLines={actions.getGoalLinesForActivity(stat.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 日別・週別の合計値テーブル */}
              <SummaryTable
                quantityUnit={stat.quantityUnit}
                data={data}
                kinds={stat.kinds}
                kindColors={kindColors}
                month={month}
              />
            </div>
          );
        }) || (
          <div className="text-center text-gray-400 py-8">
            {isLoading ? "Loading..." : "アクティビティはありません"}
          </div>
        )}
      </div>
    </div>
  );
};
