import { useMemo } from "react";

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
import { Text, View, useWindowDimensions } from "react-native";

function DashedLine({
  color,
  dashWidth = 5,
  dashGap = 4,
  thickness = 1.5,
}: {
  color: string;
  dashWidth?: number;
  dashGap?: number;
  thickness?: number;
}) {
  return (
    <View
      style={{ flexDirection: "row", overflow: "hidden", height: thickness }}
    >
      {Array.from({ length: 80 }, (_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative dashes, never reordered
          key={i}
          style={{
            width: dashWidth,
            height: thickness,
            backgroundColor: i % 2 === 0 ? color : "transparent",
            marginRight: i % 2 === 0 ? dashGap : 0,
          }}
        />
      ))}
    </View>
  );
}

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
  const containerWidth = Math.min(screenWidth, 768) - 48;

  const { yTicks, effectiveYMax } = useMemo(
    () => computeChartScale(data, dataKeys, goalLines, !!stackId),
    [data, dataKeys, goalLines, stackId],
  );

  const yAxisWidth = 7 * 6 + 4; // 7文字幅で固定（例: "300,000"）

  const tickStep = useMemo(
    () => computeXLabelStep(data.length, containerWidth, yAxisWidth, 40),
    [data.length, containerWidth, yAxisWidth],
  );

  const chartAreaHeight = height - 28;

  return (
    <View
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      style={{ padding: 8 }}
    >
      {/* Legend */}
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

      <View style={{ height }}>
        {/* Chart area with Y-axis */}
        <View style={{ height: chartAreaHeight, position: "relative" }}>
          {/* Y-axis labels + grid lines */}
          {yTicks.map((tick) => {
            const pct = tickBottomPct(tick, effectiveYMax);
            return (
              <View
                key={`tick-${tick}`}
                style={{
                  position: "absolute",
                  bottom: `${pct}%`,
                  left: 0,
                  right: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  transform: [{ translateY: 6 }],
                }}
              >
                <Text
                  style={{
                    width: yAxisWidth,
                    textAlign: "right",
                    paddingRight: 4,
                    fontSize: 9,
                    color: "#6b7280",
                  }}
                  numberOfLines={1}
                >
                  {formatTickValue(tick)}
                </Text>
                {tick > 0 && (
                  <View style={{ flex: 1 }}>
                    <DashedLine color="#e5e7eb" thickness={1} />
                  </View>
                )}
              </View>
            );
          })}

          {/* Bars + goal lines area */}
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              left: yAxisWidth,
            }}
          >
            {/* Goal lines */}
            {goalLines.map((goal) => {
              const pct = Math.min(
                tickBottomPct(goal.value, effectiveYMax),
                100,
              );
              return (
                <View
                  key={goal.id}
                  style={{
                    position: "absolute",
                    bottom: `${pct}%`,
                    left: 0,
                    right: 0,
                    zIndex: 1,
                  }}
                >
                  <DashedLine color={goal.color} />
                  <Text
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: 4,
                      fontSize: 9,
                      color: goal.color,
                    }}
                  >
                    {goal.label}
                  </Text>
                </View>
              );
            })}

            {/* Bars */}
            <View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              {data.map((d) => {
                const dateLabel = d.date as string;

                if (stackId) {
                  const total = stackedTotal(d, dataKeys);
                  const totalPct = barHeightPct(total, effectiveYMax);

                  return (
                    <View
                      key={dateLabel}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "flex-end",
                        height: "100%",
                      }}
                    >
                      <View
                        style={{
                          width: "60%",
                          maxWidth: 20,
                          height: `${totalPct}%`,
                          borderTopLeftRadius: 2,
                          borderTopRightRadius: 2,
                          overflow: "hidden",
                          flexDirection: "column-reverse",
                        }}
                      >
                        {dataKeys.map((key) => {
                          const value = (d[key.name] as number) || 0;
                          if (value === 0 || total === 0) return null;
                          return (
                            <View
                              key={key.name}
                              style={{
                                backgroundColor: key.color,
                                height: `${(value / total) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={dateLabel}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      gap: 1,
                      height: "100%",
                    }}
                  >
                    {dataKeys.map((key) => {
                      const value = (d[key.name] as number) || 0;
                      const barPct = barHeightPct(value, effectiveYMax);
                      return (
                        <View
                          key={key.name}
                          style={{
                            backgroundColor: key.color,
                            height: `${barPct}%`,
                            width: `${Math.floor(60 / dataKeys.length)}%`,
                            maxWidth: 20,
                            minWidth: 2,
                            borderTopLeftRadius: 2,
                            borderTopRightRadius: 2,
                          }}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* X-axis */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            height: 24,
            marginLeft: yAxisWidth,
            borderTopWidth: 1,
            borderColor: "#e5e7eb",
            alignItems: "center",
          }}
        >
          {data
            .map((d, i) => ({ label: d.date as string, index: i }))
            .filter((d) => shouldShowXLabel(d.index, data.length, tickStep))
            .map((d) => (
              <Text key={d.label} style={{ fontSize: 9, color: "#6b7280" }}>
                {d.label}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
}
