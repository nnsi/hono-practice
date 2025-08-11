import { useCallback, useState } from "react";

import dayjs from "dayjs";

import type {
  GetActivityStatsResponse,
  GetGoalsResponse,
} from "@dtos/response";

import type { UseQueryResult } from "@tanstack/react-query";

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

// 使用済みの色を追跡しながら色を割り当てる関数
export const getUniqueColorForKind = (
  kindName: string,
  usedColors: Set<string>,
): string => {
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

  // まず、ハッシュベースで色を決定
  let hash = 0;
  for (let i = 0; i < kindName.length; i++) {
    const char = kindName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const initialColorIndex = Math.abs(hash) % colors.length;

  // 初期色が使用されていない場合はそれを使用
  if (!usedColors.has(colors[initialColorIndex])) {
    return colors[initialColorIndex];
  }

  // 使用されていない色を探す
  for (const color of colors) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // すべての色が使用されている場合は、追加の色パレットから選択
  const additionalColors = [
    "#E69F00", // 別のオレンジ
    "#0072B2", // 別の青
    "#009E73", // 別の緑
    "#D55E00", // 別の赤
    "#CC79A7", // 別のピンク
  ];

  for (const color of additionalColors) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // それでも足りない場合は、初期色を返す（重複を許容）
  return colors[initialColorIndex];
};

export type GoalLine = {
  id: string;
  value: number;
  label: string;
  color?: string;
};

export type ActivityStatsDependencies = {
  currentDate: Date;
  useActivityStatsApi: (
    month: string,
  ) => UseQueryResult<GetActivityStatsResponse>;
  useGoals: () => UseQueryResult<GetGoalsResponse>;
};

export type UseActivityStatsReturn = {
  month: string;
  stats: GetActivityStatsResponse | undefined;
  isLoading: boolean;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  getGoalLinesForActivity: (activityId: string) => GoalLine[];
  generateAllDatesForMonth: () => string[];
};

export function createUseActivityStats(
  dependencies: ActivityStatsDependencies,
): UseActivityStatsReturn {
  const { currentDate, useActivityStatsApi, useGoals } = dependencies;

  // monthを独立して管理（初期値はcurrentDateから）
  const [internalMonth, setInternalMonth] = useState<string | null>(null);

  // monthを派生状態として扱う
  // internalMonthがnullの場合はcurrentDateから計算、そうでなければinternalMonthを使用
  const month = internalMonth ?? dayjs(currentDate).format("YYYY-MM");

  // 月変更用の関数（明示的な操作時のみinternalMonthを更新）
  const handlePrevMonth = useCallback(() => {
    const prevMonth = dayjs(month).subtract(1, "month");
    setInternalMonth(prevMonth.format("YYYY-MM"));
  }, [month]);

  const handleNextMonth = useCallback(() => {
    const nextMonth = dayjs(month).add(1, "month");
    setInternalMonth(nextMonth.format("YYYY-MM"));
  }, [month]);

  const { data: stats, isLoading } = useActivityStatsApi(month);

  // 全ての目標を取得
  const { data: goalsData } = useGoals();

  // アクティビティIDと表示月に基づいて目標ラインを計算
  const getGoalLinesForActivity = useCallback(
    (activityId: string): GoalLine[] => {
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
    },
    [goalsData, month],
  );

  // 月の全日付を生成するユーティリティ関数
  const generateAllDatesForMonth = useCallback(() => {
    const startOfMonth = dayjs(`${month}-01`);
    const daysInMonth = startOfMonth.daysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) =>
      startOfMonth.add(i, "day").format("YYYY-MM-DD"),
    );
  }, [month]);

  return {
    month,
    stats,
    isLoading,
    handlePrevMonth,
    handleNextMonth,
    getGoalLinesForActivity,
    generateAllDatesForMonth,
  };
}
