import { useContext } from "react";

import { useActivityStatsApi, useGoals } from "@frontend/hooks/api";
import { DateContext } from "@frontend/providers/DateProvider";
import {
  createUseActivityStats,
  getColorForKind,
  getUniqueColorForKind,
} from "@packages/frontend-shared/hooks/feature";

// Re-export utility functions from shared
export { getColorForKind, getUniqueColorForKind };

export type { GoalLine } from "@packages/frontend-shared/hooks/feature";

export const useActivityStats = () => {
  const { date } = useContext(DateContext);

  const dependencies = {
    currentDate: date,
    useActivityStatsApi,
    useGoals,
  };

  const { stateProps, actions } = createUseActivityStats(dependencies);

  // 後方互換性を維持
  return {
    ...stateProps,
    // 旧API互換のアクション
    handlePrevMonth: actions.onPrevMonth,
    handleNextMonth: actions.onNextMonth,
    // ヘルパー関数
    getGoalLinesForActivity: actions.getGoalLinesForActivity,
    generateAllDatesForMonth: actions.generateAllDatesForMonth,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
