import { useContext, useEffect, useState } from "react";

import { useGoals } from "@frontend/hooks/api/useGoals";
import { DateContext } from "@frontend/providers/DateProvider";
import { apiClient, qp } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { GetActivityStatsResponseSchema } from "@dtos/response";

// kind名から固定的な色を取得する関数（色覚バリアフリー対応）
export const getColorForKind = (kindName: string): string => {
  // 色覚バリアフリーに配慮した色パレット
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

export type GoalLine = {
  id: string;
  value: number;
  label: string;
  color?: string;
};

export const useActivityStats = () => {
  const { date } = useContext(DateContext);

  // monthを独立して管理
  const [month, setMonth] = useState(dayjs(date).format("YYYY-MM"));

  // dateの月が変化したときのみmonthを更新
  useEffect(() => {
    const newMonth = dayjs(date).format("YYYY-MM");
    setMonth(newMonth);
  }, [date]);

  // 月変更用の関数（monthのみを更新）
  const handlePrevMonth = () => {
    const prevMonth = dayjs(month).subtract(1, "month");
    setMonth(prevMonth.format("YYYY-MM"));
  };
  const handleNextMonth = () => {
    const nextMonth = dayjs(month).add(1, "month");
    setMonth(nextMonth.format("YYYY-MM"));
  };

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

  // 全ての目標を取得
  const { data: goalsData } = useGoals();

  // アクティビティIDと表示月に基づいて目標ラインを計算
  const getGoalLinesForActivity = (activityId: string): GoalLine[] => {
    if (!goalsData?.goals) return [];

    const monthStart = dayjs(month).startOf("month");
    const monthEnd = dayjs(month).endOf("month");

    // 該当するアクティビティの目標で、表示期間と重複するものを見つける
    const relevantGoals = goalsData.goals.filter((goal) => {
      if (goal.activityId !== activityId) return false;

      const goalStart = dayjs(goal.startDate);
      const goalEnd = goal.endDate ? dayjs(goal.endDate) : null;

      // 目標の期間が表示月と重複しているかチェック
      if (goalEnd?.isBefore(monthStart)) return false;
      if (goalStart.isAfter(monthEnd)) return false;

      return true;
    });

    // 各目標に対して横線を作成
    return relevantGoals.map((goal, index) => ({
      id: goal.id,
      value: goal.dailyTargetQuantity,
      label: `目標${relevantGoals.length > 1 ? index + 1 : ""}: ${goal.dailyTargetQuantity}`,
      color: "#ff6b6b", // 赤系統の色
    }));
  };

  // 月の全日付を生成するユーティリティ関数
  const generateAllDatesForMonth = () => {
    const startOfMonth = dayjs(`${month}-01`);
    const daysInMonth = startOfMonth.daysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) =>
      startOfMonth.add(i, "day").format("YYYY-MM-DD"),
    );
  };

  return {
    month,
    stats,
    isLoading,
    handlePrevMonth,
    handleNextMonth,
    getGoalLinesForActivity,
    generateAllDatesForMonth,
  };
};
