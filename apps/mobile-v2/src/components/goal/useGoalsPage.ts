import { useState, useMemo } from "react";
import { createUseGoalsPage } from "@packages/frontend-shared/hooks/useGoalsPage";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useActivities } from "../../hooks/useActivities";
import { useGoals } from "../../hooks/useGoals";
import { goalRepository } from "../../repositories/goalRepository";
import { syncEngine } from "../../sync/syncEngine";

export const useGoalsPage = createUseGoalsPage<ActivityRecord>({
  react: { useState, useMemo },
  useActivities,
  useGoals,
  goalRepository,
  syncEngine,
});
