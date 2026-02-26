import { useRef, useState, useEffect, useMemo } from "react";
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

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);

  const chartWidth = width - 24;
  const paddingLeft = 45;
  const hasGoalLines = goalLines.length > 0;
  const paddingRight = hasGoalLines ? 20 : 15;

  // X-axis: show all ticks but only label some (preserveStartEnd like Recharts)
  const allTickValues = useMemo(
    () => data.map((d) => d.date as string),
    [data],
  );

  const tickStep = useMemo(() => {
    if (data.length === 0 || width === 0) return 1;
    const available = chartWidth - paddingLeft - paddingRight;
    // Target ~40px per label for Japanese date labels like "28日"
    const maxLabels = Math.max(2, Math.floor(available / 40));
    return Math.max(1, Math.ceil(data.length / maxLabels));
  }, [data.length, width, chartWidth, paddingLeft, paddingRight]);

  const tickFormat = useMemo(() => {
    return (tick: string, index: number) => {
      if (index === 0 || index === data.length - 1) return tick;
      // Hide label if too close to the last tick
      if (index % tickStep === 0 && data.length - 1 - index >= tickStep) {
        return tick;
      }
      return "";
    };
  }, [data.length, tickStep]);

  // Y domain
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

  // Bar width
  const barWidth = useMemo(() => {
    const available = chartWidth - paddingLeft - paddingRight;
    const barArea = available / data.length;
    // For grouped (non-stacked) bars, divide by number of keys
    const groupDivisor = stackId ? 1 : dataKeys.length;
    const w = (barArea * 0.7) / groupDivisor;
    return Math.max(3, Math.min(24, w));
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
          style={{ fontSize: 11, fill: "#374151" }}
          flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
          renderInPortal={false}
        />
      }
    />
  ));

  if (width === 0) {
    return (
      <div
        ref={containerRef}
        className="bg-white rounded-lg p-3 border"
        style={{ height }}
      />
    );
  }

  return (
    <div ref={containerRef} className="bg-white rounded-lg p-3 border">
      {showLegend && dataKeys.length > 1 && (
        <div className="flex flex-wrap gap-3 px-2 pb-1">
          {dataKeys.map((key) => (
            <div key={key.name} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: key.color }}
              />
              <span className="text-xs text-gray-600">{key.name}</span>
            </div>
          ))}
        </div>
      )}
      <VictoryChart
        width={chartWidth}
        height={height}
        padding={{ top: 15, right: paddingRight, bottom: 35, left: paddingLeft }}
        domainPadding={{ x: barWidth }}
        domain={{ y: [0, yMax] }}
      >
        {/* X Axis */}
        <VictoryAxis
          tickValues={allTickValues}
          tickFormat={tickFormat}
          style={{
            axis: { stroke: "#e5e7eb" },
            tickLabels: { fontSize: 10, fill: "#6b7280", padding: 5 },
            grid: { stroke: "none" },
          }}
        />

        {/* Y Axis */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "#e5e7eb" },
            tickLabels: { fontSize: 11, fill: "#6b7280", padding: 5 },
            grid: { stroke: "#f3f4f6", strokeDasharray: "4 4" },
          }}
        />

        {/* Bars */}
        {stackId ? <VictoryStack>{bars}</VictoryStack> : bars}

        {/* Goal lines */}
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
            labels={({ datum }) =>
              datum._isLast ? goal.label : ""
            }
            labelComponent={
              <VictoryLabel
                textAnchor="end"
                dx={-5}
                dy={-10}
                style={{ fill: goal.color, fontSize: 11 }}
              />
            }
          />
        ))}
      </VictoryChart>
    </div>
  );
}
