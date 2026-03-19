import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ChartData,
  GoalLine,
} from "@packages/frontend-shared/types/stats";
import {
  barHeightPct,
  computeChartScale,
  computeXLabelStep,
  formatTickValue,
  shouldShowXLabel,
  stackedTotal,
  tickBottomPct,
} from "@packages/frontend-shared/utils/chartUtils";

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

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    lines: { name: string; value: number; color: string }[];
  } | null>(null);

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
          value: (d[key.name] as number) || 0,
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
          {/* Y-axis labels + grid lines as unified rows */}
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

          {/* Chart area (overlays on top of grid, offset by yAxisWidth) */}
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{ left: yAxisWidth }}
          >
            {/* Goal lines */}
            {goalLines.map((goal) => {
              const pct = Math.min(
                tickBottomPct(goal.value, effectiveYMax),
                100,
              );
              return (
                <div
                  key={goal.id}
                  className="absolute left-0 right-0 z-[1]"
                  style={{ bottom: `${pct}%` }}
                >
                  <div
                    style={{
                      borderTopColor: goal.color,
                      borderTopStyle: "dashed",
                      borderTopWidth: 1.5,
                    }}
                  />
                  <span
                    className="text-[10px] absolute right-0 whitespace-nowrap"
                    style={{ color: goal.color, bottom: 4 }}
                  >
                    {goal.label}
                  </span>
                </div>
              );
            })}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end">
              {data.map((d) => {
                const dateLabel = d.date as string;

                if (stackId) {
                  const total = stackedTotal(d, dataKeys);
                  const totalPct = barHeightPct(total, effectiveYMax);

                  return (
                    <div
                      key={dateLabel}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      onMouseMove={(e) => handleBarHover(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className="w-[60%] max-w-6 flex flex-col-reverse rounded-t-sm overflow-hidden"
                        style={{ height: `${totalPct}%` }}
                      >
                        {dataKeys.map((key) => {
                          const value = (d[key.name] as number) || 0;
                          if (value === 0 || total === 0) return null;
                          return (
                            <div
                              key={key.name}
                              style={{
                                backgroundColor: key.color,
                                height: `${(value / total) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dateLabel}
                    className="flex-1 flex items-end justify-center gap-px h-full"
                    onMouseMove={(e) => handleBarHover(e, d)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {dataKeys.map((key) => {
                      const value = (d[key.name] as number) || 0;
                      const barPct = barHeightPct(value, effectiveYMax);
                      return (
                        <div
                          key={key.name}
                          className="rounded-t-sm"
                          style={{
                            backgroundColor: key.color,
                            height: `${barPct}%`,
                            width: `${Math.floor(60 / dataKeys.length)}%`,
                            maxWidth: 24,
                            minWidth: 2,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X-axis */}
        <div
          className="flex border-t border-gray-200"
          style={{ height: 28, marginLeft: yAxisWidth }}
        >
          {data.map((d, i) => (
            <div
              key={d.date as string}
              className="flex-1 flex items-center justify-center"
            >
              {shouldShowXLabel(i, data.length, tickStep) && (
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {d.date as string}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-white border rounded-lg shadow-sm px-2.5 py-1.5 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.lines.map((l) => (
            <div key={l.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-gray-700">
                {l.name}: {l.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
