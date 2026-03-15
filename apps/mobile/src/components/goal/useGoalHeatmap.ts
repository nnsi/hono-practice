import { useMemo } from "react";

import { createUseGoalHeatmap } from "@packages/frontend-shared/hooks/useGoalHeatmap";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useGoals } from "../../hooks/useGoals";
import { activityLogRepository } from "../../repositories/activityLogRepository";

function useActivityLogsBetween(
  activityIds: string[],
  start: string,
  end: string,
) {
  return useLiveQuery("activity_logs", async () => {
    if (activityIds.length === 0) return [];
    const logs = await activityLogRepository.getActivityLogsBetween(start, end);
    const activityIdSet = new Set(activityIds);
    return logs.filter((log) => activityIdSet.has(log.activityId));
  }, [activityIds.join(","), start, end]);
}

export const useGoalHeatmap = createUseGoalHeatmap({
  react: { useMemo },
  useGoals,
  useActivityLogsBetween,
});
