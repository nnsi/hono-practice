import {
  type GoalLine,
  getColorForKind,
  useActivityStats,
} from "@frontend/hooks/feature/activity/useActivityStats";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
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
  const {
    month,
    stats,
    isLoading,
    handlePrevMonth,
    handleNextMonth,
    getGoalLinesForActivity,
    generateAllDatesForMonth,
  } = useActivityStats();

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-3">
        <button type="button" onClick={handlePrevMonth} className="ml-1">
          <ChevronLeftIcon />
        </button>
        <span>{dayjs(month).format("YYYY年MM月")}</span>
        <button type="button" onClick={handleNextMonth}>
          <ChevronRightIcon />
        </button>
      </div>
      <hr className="my-6" />
      <div className="space-y-6">
        {stats?.map((stat) => {
          // 月の全日付を生成
          const allDates = generateAllDatesForMonth();

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
                        key={kind.id || kind.name}
                        className="bg-white rounded-lg p-4 border shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {kind.name}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{
                            color: getColorForKind(kind.name),
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
                      color: getColorForKind(kind.name),
                    }))}
                    stackId="a"
                    showLegend={stat.kinds[0].name !== "未指定"}
                    goalLines={getGoalLinesForActivity(stat.id)}
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
                                color: getColorForKind(kind.name),
                              },
                            ]}
                            height={250}
                            showLegend={false}
                            goalLines={getGoalLinesForActivity(stat.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
