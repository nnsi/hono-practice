import { useMemo } from "react";

import { createUseGoalHeatmap } from "@packages/frontend-shared/hooks/useGoalHeatmap";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";
import { useGoals } from "../../hooks/useGoals";

function useActivityLogsBetween(
  activityIds: string[],
  start: string,
  end: string,
) {
  return useLiveQuery(() => {
    if (activityIds.length === 0) return [];
    const activityIdSet = new Set(activityIds);
    return db.activityLogs
      .where("date")
      .between(start, end, true, true)
      .filter((log) => activityIdSet.has(log.activityId) && !log.deletedAt)
      .toArray();
  }, [activityIds.join(","), start, end]);
}

export const useGoalHeatmap = createUseGoalHeatmap({
  react: { useMemo },
  useGoals,
  useActivityLogsBetween,
});
