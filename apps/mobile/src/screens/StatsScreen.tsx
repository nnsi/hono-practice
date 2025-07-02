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
import dayjs from "dayjs";
import { StackedBarChart } from "react-native-chart-kit";

import { GetActivityStatsResponseSchema } from "@dtos/response";

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
    const startOfMonth = dayjs(`${month}-01`);
    const daysInMonth = startOfMonth.daysInMonth();
    const allDates = Array.from({ length: daysInMonth }, (_, i) =>
      startOfMonth.add(i, "day").format("YYYY-MM-DD"),
    );

    // 積み上げ棒グラフ用のデータを作成（全ての日付を表示）
    const stackedData = allDates.map((date) => {
      return stat.kinds.map((kind: any) => {
        const logs = kind.logs.filter(
          (l: any) => dayjs(l.date).format("YYYY-MM-DD") === date,
        );
        return logs.reduce((sum: number, l: any) => sum + l.quantity, 0);
      });
    });

    // ラベルを作成（1日から月末まで）
    const labels = allDates.map((date) => dayjs(date).format("D"));

    // 全て0の場合は空のグラフを表示
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

    const chartData = {
      labels: labels,
      legend: stat.kinds.map((kind: any) => kind.name),
      data: stackedData,
      barColors: stat.kinds.map((kind: any) => getColorForKind(kind.name)),
    };

    return (
      <>
        <StackedBarChart
          data={chartData}
          width={width - 32}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            barPercentage: 0.5,
            useShadowColorFromDataset: false,
            style: {
              borderRadius: 16,
            },
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          hideLegend={true}
        />

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
});
