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
import type { ChartData, GoalLine } from "./types";

export function ActivityChart({
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
