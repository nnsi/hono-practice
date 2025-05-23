import { useContext } from "react";

import { DateContext } from "@frontend/providers/DateProvider";
import { apiClient, qp } from "@frontend/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { GetActivityStatsResponseSchema } from "@dtos/response";

// kind名から固定的な色を取得する関数
const getColorForKind = (kindName: string): string => {
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#8dd1e1",
    "#d084d0",
    "#ffb366",
    "#67b7dc",
    "#a4de6c",
    "#ff9999",
  ];

  // 文字列のハッシュ値を計算
  let hash = 0;
  for (let i = 0; i < kindName.length; i++) {
    const char = kindName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit整数に変換
  }

  // ハッシュ値を色配列のインデックスにマッピング
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const ActivityStatsPage: React.FC = () => {
  const { date, setDate } = useContext(DateContext);

  // 月変更用の関数
  const handlePrevMonth = () => {
    const prevMonth = dayjs(date).subtract(1, "month");
    setDate(prevMonth.endOf("month").toDate());
  };
  const handleNextMonth = () => {
    const nextMonth = dayjs(date).add(1, "month");
    setDate(nextMonth.startOf("month").toDate());
  };

  const month = dayjs(date).format("YYYY-MM");

  const { data: stats, isLoading } = useQuery({
    ...qp({
      queryKey: ["activity-stats-monthly", month],
      queryFn: () =>
        apiClient.users["activity-logs"].stats.$get({
          query: {
            date: month,
          },
        }),
      schema: GetActivityStatsResponseSchema,
    }),
  });

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-3">
        <button type="button" onClick={handlePrevMonth} className="ml-1">
          <ChevronLeftIcon />
        </button>
        <span>{dayjs(date).format("YYYY年MM月")}</span>
        <button type="button" onClick={handleNextMonth}>
          <ChevronRightIcon />
        </button>
      </div>
      <hr className="my-6" />
      <div className="space-y-6">
        {stats?.map((stat) => {
          // 月の全日付を生成
          const startOfMonth = dayjs(`${month}-01`);
          const daysInMonth = startOfMonth.daysInMonth();
          const allDates = Array.from({ length: daysInMonth }, (_, i) =>
            startOfMonth.add(i, "day").format("YYYY-MM-DD"),
          );

          // 日付ごとに各kindの合計値を集計
          const data = allDates.map((date) => {
            const kindsData: Record<string, number> = {};
            stat.kinds.forEach((kind) => {
              const log = kind.logs.filter(
                (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
              );
              kindsData[kind.name] = log
                ? (kindsData[kind.name] ?? 0) +
                  log.reduce((sum, l) => sum + l.quantity, 0)
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
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">各種類別の集計</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stat.kinds.map((kind) => (
                    <div
                      key={kind.id || kind.name}
                      className="bg-white rounded-lg p-3 border shadow-sm"
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
              <div>
                <h3 className="text-lg font-semibold mb-3">日別推移</h3>
                {stat.showCombinedStats ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      {stat.kinds[0].name !== "未指定" && <Legend />}
                      {stat.kinds.map((kind) => (
                        <Bar
                          key={kind.id || kind.name}
                          dataKey={kind.name}
                          fill={getColorForKind(kind.name)}
                          name={kind.name !== "未指定" ? kind.name : stat.name}
                          stackId="a"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
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
                            ? log.reduce((sum, l) => sum + l.quantity, 0)
                            : 0,
                        };
                      });
                      return (
                        <div
                          key={kind.id || kind.name}
                          className="bg-white rounded-lg p-4 border"
                        >
                          <h4 className="font-semibold mb-2">
                            {kind.name} (合計: {kind.total} {stat.quantityUnit})
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                              data={kindData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 5,
                              }}
                            >
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar
                                dataKey={kind.name}
                                fill={getColorForKind(kind.name)}
                                name={kind.name}
                              />
                            </BarChart>
                          </ResponsiveContainer>
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
