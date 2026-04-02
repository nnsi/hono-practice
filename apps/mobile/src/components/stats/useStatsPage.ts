import { useCallback, useMemo, useState } from "react";

import { createUseStatsPage } from "@packages/frontend-shared/hooks/useStatsPage";
import dayjs from "dayjs";

import { useLiveQuery } from "../../db/useLiveQuery";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { activityRepository } from "../../repositories/activityRepository";
import { goalRepository } from "../../repositories/goalRepository";

const _useStatsPage = createUseStatsPage({
  react: { useState, useMemo, useCallback },
  useActivities() {
    return useLiveQuery("activities", () =>
      activityRepository.getAllActivitiesIncludingDeleted(),
    );
  },
  useAllKinds() {
    return useLiveQuery("activity_kinds", () =>
      activityRepository.getAllActivityKindsIncludingDeleted(),
    );
  },
  useMonthLogs(startDate, endDate) {
    return useLiveQuery(
      "activity_logs",
      () => activityLogRepository.getActivityLogsBetween(startDate, endDate),
      [startDate, endDate],
    );
  },
  useGoals() {
    return useLiveQuery("goals", () => goalRepository.getAllGoals());
  },
  dayjs,
});

export function useStatsPage() {
  return _useStatsPage();
}
