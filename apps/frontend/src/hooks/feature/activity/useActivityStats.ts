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

  return createUseActivityStats(dependencies);
};
