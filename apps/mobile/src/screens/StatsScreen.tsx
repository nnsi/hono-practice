import type React from "react";
import { useState } from "react";

import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { scaleBand, scaleLinear } from "d3-scale";
import dayjs from "dayjs";
import Svg, { Line, Text as SvgText, G, Rect } from "react-native-svg";

import { GetActivityStatsResponseSchema } from "@dtos/response";

import { useGoals } from "../hooks/useGoals";
import { apiClient } from "../utils/apiClient";

const { width } = Dimensions.get("window");

// kind名から固定的な色を取得する関数（色覚バリアフリー対応）
const getColorForKind = (kindName: string): string => {
  const colors = [
    "#0173B2", // 濃い青
    "#DE8F05", // オレンジ
    "#029E73", // 緑
    "#D55E00", // 赤
    "#CC79A7", // ピンク
    "#F0E442", // 黄色
    "#56B4E9", // 明るい青
    "#999999", // グレー
    "#7570B3", // 紫
    "#1B9E77", // 濃い緑
  ];

  let hash = 0;
  for (let i = 0; i < kindName.length; i++) {
    const char = kindName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const StatsScreen: React.FC = () => {
  const [date, setDate] = useState(new Date());
  const { data: goalsData } = useGoals({ isActive: true });

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
    queryKey: ["activity-stats-monthly", month],
    queryFn: async () => {
      const res = await apiClient.users["activity-logs"].stats.$get({
        query: {
          date: month,
        },
      });
      const json = await res.json();
      const result = GetActivityStatsResponseSchema.safeParse(json);
      if (!result.success) {
        throw new Error("Failed to parse stats");
      }
      return result.data;
    },
  });

  const renderChart = (stat: any) => {
    // アクティビティに対する目標値を取得
    const goal = goalsData?.goals.find((g) => g.activityId === stat.id);
    const startOfMonth = dayjs(`${month}-01`);
    const daysInMonth = startOfMonth.daysInMonth();
    const allDates = Array.from({ length: daysInMonth }, (_, i) =>
      startOfMonth.add(i, "day").format("YYYY-MM-DD"),
    );

    if (stat.showCombinedStats) {
      // 各種別ごとに日付ごとのデータを集計
      const kindDataMap = stat.kinds.map((kind: any) => {
        const dailyData = allDates.map((date) => {
          const logs = kind.logs.filter(
            (l: any) => dayjs(l.date).format("YYYY-MM-DD") === date,
          );
          return logs.reduce((sum: number, l: any) => sum + l.quantity, 0);
        });
        return { kind, dailyData };
      });

      // 積み上げ用のデータを作成
      const stackedData = allDates.map((_, index) => {
        const values: number[] = [];
        kindDataMap.forEach(({ dailyData }) => {
          values.push(dailyData[index]);
        });
        return values;
      });

      const hasData = stackedData.some((dayData) =>
        dayData.some((value) => value > 0),
      );

      if (!hasData) {
        return (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: "#999" }}>データがありません</Text>
          </View>
        );
      }

      // ラベルを5日ごとに表示
      const labels = allDates.map((date, index) => {
        const day = dayjs(date).date();
        return day % 5 === 1 || day === daysInMonth ? `${day}日` : "";
      });

      // グラフの最大値を計算
      const maxValue =
        Math.max(
          ...stackedData.map((dayData) =>
            dayData.reduce((sum, value) => sum + value, 0),
          ),
          goal?.dailyTargetQuantity || 0,
        ) * 1.2;

      // D3スケールの設定
      const chartWidth = width - 80;
      const chartHeight = 220;
      const marginTop = 20;
      const marginBottom = 40;
      const marginLeft = 50;
      const marginRight = 30;

      const xScale = scaleBand()
        .domain(allDates.map((_, i) => i.toString()))
        .range([marginLeft, chartWidth - marginRight])
        .padding(0.3);

      const yScale = scaleLinear()
        .domain([0, maxValue])
        .range([chartHeight - marginBottom, marginTop]);

      // Y軸のティック
      const yTicks = yScale.ticks(5);

      return (
        <>
          <View style={{ height: 280 }}>
            <Svg width={chartWidth} height={chartHeight}>
              {/* グリッド線 */}
              {yTicks.map((tick) => (
                <Line
                  key={tick}
                  x1={marginLeft}
                  y1={yScale(tick)}
                  x2={chartWidth - marginRight}
                  y2={yScale(tick)}
                  stroke="#e0e0e0"
                  strokeDasharray="2 3"
                />
              ))}

              {/* Y軸ラベル */}
              {yTicks.map((tick) => (
                <SvgText
                  key={`ylabel-${tick}`}
                  x={marginLeft - 10}
                  y={yScale(tick) + 4}
                  fontSize="10"
                  fill="#666666"
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              ))}

              {/* X軸ラベル */}
              {allDates.map((date, index) => {
                const day = dayjs(date).date();
                if (day % 5 === 1 || day === daysInMonth) {
                  return (
                    <SvgText
                      key={`xlabel-${date}`}
                      x={xScale(index.toString())! + xScale.bandwidth() / 2}
                      y={chartHeight - marginBottom + 20}
                      fontSize="10"
                      fill="#666666"
                      textAnchor="middle"
                    >
                      {day}日
                    </SvgText>
                  );
                }
                return null;
              })}

              {/* 積み上げ棒グラフ */}
              {allDates.map((_, dayIndex) => {
                let cumulativeHeight = 0;
                return (
                  <G key={`day-${allDates[dayIndex]}`}>
                    {kindDataMap.map(({ kind, dailyData }, kindIndex) => {
                      const value = dailyData[dayIndex];
                      if (value === 0) return null;

                      // この種別のバーの高さ
                      const barHeight = yScale(0) - yScale(value);
                      // 積み上げのy座標（前の種別の上に乗せる）
                      const y = yScale(cumulativeHeight + value);
                      // 次の種別のために累積値を更新
                      cumulativeHeight += value;

                      return (
                        <Rect
                          key={`${kind.name}-${dayIndex}`}
                          x={xScale(dayIndex.toString())}
                          y={y}
                          width={xScale.bandwidth()}
                          height={barHeight}
                          fill={getColorForKind(kind.name)}
                        />
                      );
                    })}
                  </G>
                );
              })}

              {/* 目標ライン */}
              {goal && (
                <>
                  <Line
                    x1={marginLeft}
                    y1={yScale(goal.dailyTargetQuantity)}
                    x2={chartWidth - marginRight}
                    y2={yScale(goal.dailyTargetQuantity)}
                    stroke="#ff0000"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />
                  <SvgText
                    x={marginLeft + 5}
                    y={yScale(goal.dailyTargetQuantity) - 5}
                    fill="#ff0000"
                    fontSize="10"
                  >
                    目標: {goal.dailyTargetQuantity}
                  </SvgText>
                </>
              )}
            </Svg>
          </View>
          {/* 凡例をグラフの下に表示 */}
          {!(stat.kinds.length === 1 && stat.kinds[0].name === "未指定") && (
            <View style={styles.legendContainer}>
              {stat.kinds.map((kind: any) => (
                <View key={kind.id || kind.name} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: getColorForKind(kind.name) },
                    ]}
                  />
                  <Text style={styles.legendText}>{kind.name}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      );
    }
    // 個別棒グラフ
    return (
      <View>
        {stat.kinds.map((kind: any) => {
          const dailyData = allDates.map((date) => {
            const logs = kind.logs.filter(
              (l: any) => dayjs(l.date).format("YYYY-MM-DD") === date,
            );
            return logs.reduce((sum: number, l: any) => sum + l.quantity, 0);
          });

          const hasData = dailyData.some((value) => value > 0);

          if (!hasData) {
            return (
              <View key={kind.id || kind.name} style={styles.kindChartCard}>
                <Text style={styles.kindChartTitle}>
                  {kind.name} (合計: {kind.total} {stat.quantityUnit})
                </Text>
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ color: "#999" }}>データがありません</Text>
                </View>
              </View>
            );
          }

          // グラフの最大値を計算
          const maxValue =
            Math.max(...dailyData, goal?.dailyTargetQuantity || 0) * 1.2;

          // D3スケールの設定
          const chartWidth = width - 80;
          const chartHeight = 220;
          const marginTop = 20;
          const marginBottom = 40;
          const marginLeft = 50;
          const marginRight = 30;

          const xScale = scaleBand()
            .domain(allDates.map((_, i) => i.toString()))
            .range([marginLeft, chartWidth - marginRight])
            .padding(0.3);

          const yScale = scaleLinear()
            .domain([0, maxValue])
            .range([chartHeight - marginBottom, marginTop]);

          // Y軸のティック
          const yTicks = yScale.ticks(5);

          return (
            <View key={kind.id || kind.name} style={styles.kindChartCard}>
              <Text style={styles.kindChartTitle}>
                {kind.name} (合計: {kind.total} {stat.quantityUnit})
              </Text>
              <View style={{ height: 220, position: "relative" }}>
                <Svg width={chartWidth} height={chartHeight}>
                  {/* グリッド線 */}
                  {yTicks.map((tick) => (
                    <Line
                      key={tick}
                      x1={marginLeft}
                      y1={yScale(tick)}
                      x2={chartWidth - marginRight}
                      y2={yScale(tick)}
                      stroke="#e0e0e0"
                      strokeDasharray="2 3"
                    />
                  ))}

                  {/* Y軸ラベル */}
                  {yTicks.map((tick) => (
                    <SvgText
                      key={`ylabel-${tick}`}
                      x={marginLeft - 10}
                      y={yScale(tick) + 4}
                      fontSize="10"
                      fill="#666666"
                      textAnchor="end"
                    >
                      {tick}
                    </SvgText>
                  ))}

                  {/* X軸ラベル */}
                  {allDates.map((date, index) => {
                    const day = dayjs(date).date();
                    if (day % 5 === 1 || day === daysInMonth) {
                      return (
                        <SvgText
                          key={`xlabel-${date}`}
                          x={xScale(index.toString())! + xScale.bandwidth() / 2}
                          y={chartHeight - marginBottom + 20}
                          fontSize="10"
                          fill="#666666"
                          textAnchor="middle"
                        >
                          {day}日
                        </SvgText>
                      );
                    }
                    return null;
                  })}

                  {/* 棒グラフ */}
                  {dailyData.map((value, index) => {
                    if (value === 0) return null;

                    const barHeight = yScale(0) - yScale(value);
                    const y = yScale(value);

                    return (
                      <Rect
                        key={`bar-${kind.name}-${allDates[index]}`}
                        x={xScale(index.toString())}
                        y={y}
                        width={xScale.bandwidth()}
                        height={barHeight}
                        fill={getColorForKind(kind.name)}
                      />
                    );
                  })}

                  {/* 目標ライン */}
                  {goal && (
                    <>
                      <Line
                        x1={marginLeft}
                        y1={yScale(goal.dailyTargetQuantity)}
                        x2={chartWidth - marginRight}
                        y2={yScale(goal.dailyTargetQuantity)}
                        stroke="#ff0000"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                      <SvgText
                        x={marginLeft + 5}
                        y={yScale(goal.dailyTargetQuantity) - 5}
                        fill="#ff0000"
                        fontSize="10"
                      >
                        目標: {goal.dailyTargetQuantity}
                      </SvgText>
                    </>
                  )}
                </Svg>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{dayjs(date).format("YYYY年MM月")}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0173B2" />
        </View>
      ) : (
        <View style={styles.statsContainer}>
          {stats?.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <Text style={styles.statTitle}>
                {stat.name}
                {stat.showCombinedStats &&
                  ` (合計: ${stat.total} ${stat.quantityUnit})`}
              </Text>

              {!(
                stat.kinds.length === 1 && stat.kinds[0].name === "未指定"
              ) && (
                <View style={styles.kindsGrid}>
                  {stat.kinds.map((kind) => (
                    <View key={kind.id || kind.name} style={styles.kindCard}>
                      <Text style={styles.kindName}>{kind.name}</Text>
                      <Text
                        style={[
                          styles.kindTotal,
                          { color: getColorForKind(kind.name) },
                        ]}
                      >
                        {kind.total}
                        <Text style={styles.kindUnit}>
                          {" "}
                          {stat.quantityUnit}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.chartContainer}>{renderChart(stat)}</View>
            </View>
          )) || (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>アクティビティはありません</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  kindsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  kindCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    margin: 4,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  kindName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  kindTotal: {
    fontSize: 20,
    fontWeight: "bold",
  },
  kindUnit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#666",
  },
  chartContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  kindChartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  kindChartCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
