import { useCallback, useMemo, useRef, useState } from "react";

import type {
  ChartData,
  GoalLine,
} from "@packages/frontend-shared/types/stats";
import {
  computeChartScale,
  computeXLabelStep,
  formatTickValue,
  shouldShowXLabel,
  tickBottomPct,
} from "@packages/frontend-shared/utils/chartUtils";

import { ChartBars } from "./ChartBars";
import { ChartGoalLines } from "./ChartGoalLines";
import { ChartTooltip, type TooltipData } from "./ChartTooltip";
import { useContainerWidth } from "./useContainerWidth";

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

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { yTicks, effectiveYMax } = useMemo(
    () => computeChartScale(data, dataKeys, goalLines, !!stackId),
    [data, dataKeys, goalLines, stackId],
  );

  const yAxisWidth = 7 * 7 + 8; // 7文字幅で固定（例: "300,000"）

  const tickStep = useMemo(
    () => computeXLabelStep(data.length, width, yAxisWidth),
    [data.length, width, yAxisWidth],
  );

  const chartAreaHeight = height - 32;

  const handleBarHover = useCallback(
    (e: React.MouseEvent, d: ChartData) => {
      const lines = dataKeys
        .map((key) => ({
          name: key.name,
          value: d.values[key.name] || 0,
          color: key.color,
        }))
        .filter((l) => l.value > 0);
      if (lines.length === 0) {
        setTooltip(null);
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        lines,
      });
    },
    [dataKeys],
  );

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
    <div
      ref={containerRef}
      className="bg-white rounded-lg p-3 border relative"
      onMouseLeave={() => setTooltip(null)}
    >
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

      <div style={{ height }}>
        <div className="relative" style={{ height: chartAreaHeight }}>
          {/* Y-axis labels + grid lines */}
          {yTicks.map((tick) => (
            <div
              key={`tick-${tick}`}
              className="absolute flex items-center"
              style={{
                bottom: `${tickBottomPct(tick, effectiveYMax)}%`,
                left: 0,
                right: 0,
                transform: "translateY(50%)",
              }}
            >
              <span
                className="text-[10px] text-gray-500 leading-none whitespace-nowrap shrink-0 text-right pr-2"
                style={{ width: yAxisWidth }}
              >
                {formatTickValue(tick)}
              </span>
              {tick > 0 && (
                <div className="flex-1 border-t border-dashed border-gray-200" />
              )}
            </div>
          ))}

          {/* Chart area */}
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{ left: yAxisWidth }}
          >
            <ChartGoalLines
              goalLines={goalLines}
              effectiveYMax={effectiveYMax}
            />

            <ChartBars
              data={data}
              dataKeys={dataKeys}
              effectiveYMax={effectiveYMax}
              stackId={stackId}
              onBarHover={handleBarHover}
              onBarLeave={() => setTooltip(null)}
            />
          </div>
        </div>

        {/* X-axis */}
        <div
          className="flex border-t border-gray-200"
          style={{ height: 28, marginLeft: yAxisWidth }}
        >
          {data.map((d, i) => (
            <div
              key={d.date}
              className="flex-1 flex items-center justify-center"
            >
              {shouldShowXLabel(i, data.length, tickStep) && (
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {d.date}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {tooltip && <ChartTooltip tooltip={tooltip} />}
    </div>
  );
}
