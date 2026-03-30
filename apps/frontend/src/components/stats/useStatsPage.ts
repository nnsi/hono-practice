import { useCallback, useMemo, useState } from "react";

import { createUseStatsPage } from "@packages/frontend-shared/hooks/useStatsPage";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";

const _useStatsPage = createUseStatsPage({
  react: { useState, useMemo, useCallback },
  useActivities() {
    return useLiveQuery(() =>
      db.activities
        .orderBy("orderIndex")
        .filter((a) => !a.deletedAt)
        .toArray(),
    );
  },
  useAllKinds() {
    return useLiveQuery(() =>
      db.activityKinds.filter((k) => !k.deletedAt).toArray(),
    );
  },
  useMonthLogs(startDate, endDate) {
    return useLiveQuery(
      () =>
        db.activityLogs
          .where("date")
          .between(startDate, endDate, true, true)
          .filter((log) => log.deletedAt === null)
          .toArray(),
      [startDate, endDate],
    );
  },
  useGoals() {
    return useLiveQuery(() => db.goals.filter((g) => !g.deletedAt).toArray());
  },
  dayjs,
});

export function useStatsPage() {
  return _useStatsPage();
}
