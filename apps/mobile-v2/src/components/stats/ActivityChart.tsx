import { useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTooltip,
  VictoryStack,
  VictoryLine,
  VictoryLabel,
} from "victory";
import type { ChartData, GoalLine } from "./types";

export function ActivityChart({
  data,
  dataKeys,
  height = 260,
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
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 48;

  const paddingLeft = 45;
  const hasGoalLines = goalLines.length > 0;
  const paddingRight = hasGoalLines ? 20 : 15;

  const allTickValues = useMemo(
    () => data.map((d) => d.date as string),
    [data],
  );

  const tickStep = useMemo(() => {
    if (data.length === 0 || chartWidth === 0) return 1;
    const available = chartWidth - paddingLeft - paddingRight;
    const maxLabels = Math.max(2, Math.floor(available / 36));
    return Math.max(1, Math.ceil(data.length / maxLabels));
  }, [data.length, chartWidth, paddingLeft, paddingRight]);

  const tickFormat = useMemo(() => {
    return (tick: string, index: number) => {
      if (index === 0 || index === data.length - 1) return tick;
      if (index % tickStep === 0 && data.length - 1 - index >= tickStep) {
        return tick;
      }
      return "";
    };
  }, [data.length, tickStep]);

  const yMax = useMemo(() => {
    let max = 0;
    if (stackId) {
      for (const d of data) {
        let sum = 0;
        for (const key of dataKeys) {
          sum += (d[key.name] as number) || 0;
        }
        max = Math.max(max, sum);
      }
    } else {
      for (const d of data) {
        for (const key of dataKeys) {
          max = Math.max(max, (d[key.name] as number) || 0);
        }
      }
    }
    for (const goal of goalLines) {
      max = Math.max(max, goal.value);
    }
    return max === 0 ? 10 : Math.ceil(max * 1.15);
  }, [data, dataKeys, stackId, goalLines]);

  const barWidth = useMemo(() => {
    const available = chartWidth - paddingLeft - paddingRight;
    const barArea = available / data.length;
    const groupDivisor = stackId ? 1 : dataKeys.length;
    const w = (barArea * 0.7) / groupDivisor;
    return Math.max(2, Math.min(20, w));
  }, [chartWidth, paddingLeft, paddingRight, data.length, dataKeys.length, stackId]);

  const bars = dataKeys.map((key) => (
    <VictoryBar
      key={key.name}
      data={data}
      x="date"
      y={key.name}
      style={{ data: { fill: key.color, width: barWidth } }}
      cornerRadius={{ top: 2 }}
      labels={({ datum }) => {
        const val = datum[key.name] ?? datum._y ?? 0;
        return val > 0 ? `${key.name}: ${val}` : "";
      }}
      labelComponent={
        <VictoryTooltip
          cornerRadius={8}
          flyoutStyle={{
            stroke: "#e5e7eb",
            strokeWidth: 1,
            fill: "white",
          }}
          style={{ fontSize: 10, fill: "#374151" }}
          flyoutPadding={{ top: 4, bottom: 4, left: 8, right: 8 }}
          renderInPortal={false}
        />
      }
    />
  ));

  return (
    <View className="bg-white rounded-lg border border-gray-200 p-2">
      {showLegend && dataKeys.length > 1 && (
        <View className="flex-row flex-wrap gap-3 px-2 pb-1">
          {dataKeys.map((key) => (
            <View key={key.name} className="flex-row items-center gap-1.5">
              <View
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: key.color }}
              />
              <Text className="text-xs text-gray-600">{key.name}</Text>
            </View>
          ))}
        </View>
      )}
      <VictoryChart
        width={chartWidth}
        height={height}
        padding={{
          top: 15,
          right: paddingRight,
          bottom: 35,
          left: paddingLeft,
        }}
        domainPadding={{ x: barWidth }}
        domain={{ y: [0, yMax] }}
      >
        <VictoryAxis
          tickValues={allTickValues}
          tickFormat={tickFormat}
          style={{
            axis: { stroke: "#e5e7eb" },
            tickLabels: { fontSize: 9, fill: "#6b7280", padding: 5 },
            grid: { stroke: "none" },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "#e5e7eb" },
            tickLabels: { fontSize: 10, fill: "#6b7280", padding: 5 },
            grid: { stroke: "#f3f4f6", strokeDasharray: "4 4" },
          }}
        />
        {stackId ? <VictoryStack>{bars}</VictoryStack> : bars}
        {goalLines.map((goal) => (
          <VictoryLine
            key={`goal-${goal.id}`}
            data={data.map((d, i) => ({
              x: d.date as string,
              y: goal.value,
              _isLast: i === data.length - 1,
            }))}
            style={{
              data: {
                stroke: goal.color,
                strokeDasharray: "5 5",
                strokeWidth: 1.5,
              },
            }}
            labels={({ datum }) => (datum._isLast ? goal.label : "")}
            labelComponent={
              <VictoryLabel
                textAnchor="end"
                dx={-5}
                dy={-10}
                style={{ fill: goal.color, fontSize: 10 }}
              />
            }
          />
        ))}
      </VictoryChart>
    </View>
  );
}
