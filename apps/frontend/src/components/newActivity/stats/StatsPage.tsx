import { useContext } from "react";

import { DateContext } from "@frontend/providers/DateProvider";
import { apiClient, qp } from "@frontend/utils";
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

export const ActivityStatsPage: React.FC = () => {
  const { date } = useContext(DateContext);

  const month = dayjs(date).format("YYYY-MM");

  const { data: stats } = useQuery({
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
    <div className="space-y-8">
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
            const log = kind.logs.find(
              (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
            );
            kindsData[kind.name] = log ? log.quantity : 0;
          });
          return {
            date: dayjs(date).format("D"), // 横軸を日付（1,2,3...）で表示
            ...kindsData,
          };
        });

        return (
          <div key={stat.id}>
            <h2 className="text-lg font-bold mb-2">
              {stat.name}
              {stat.showCombinedStats &&
                ` (合計: ${stat.total} ${stat.quantityUnit})`}
            </h2>
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
                  {stat.kinds.map((kind, idx) => (
                    <Bar
                      key={kind.id || kind.name}
                      dataKey={kind.name}
                      fill={
                        ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"][
                          idx % 5
                        ]
                      }
                      name={kind.name !== "未指定" ? kind.name : stat.name}
                      stackId="a"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stat.kinds.map((kind, idx) => {
                  // kindごとにデータを抽出
                  const kindData = allDates.map((date) => {
                    const log = kind.logs.find(
                      (l) => dayjs(l.date).format("YYYY-MM-DD") === date,
                    );
                    return {
                      date: dayjs(date).format("D"),
                      [kind.name]: log ? log.quantity : 0,
                    };
                  });
                  return (
                    <div key={kind.id || kind.name}>
                      <h3 className="font-semibold mb-1">
                        {kind.name} (合計:
                        {kind.logs.reduce((sum, l) => sum + l.quantity, 0)}
                        {stat.quantityUnit})
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={kindData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar
                            dataKey={kind.name}
                            fill={
                              [
                                "#8884d8",
                                "#82ca9d",
                                "#ffc658",
                                "#ff8042",
                                "#8dd1e1",
                              ][idx % 5]
                            }
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
        );
      })}
    </div>
  );
};
