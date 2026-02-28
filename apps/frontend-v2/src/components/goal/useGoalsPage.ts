import { useState, useMemo } from "react";
import { createUseGoalsPage } from "@packages/frontend-shared/hooks/useGoalsPage";
import { useActivities } from "../../hooks/useActivities";
import { useGoals } from "../../hooks/useGoals";
import { goalRepository } from "../../db/goalRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity } from "../../db/schema";

export const useGoalsPage = createUseGoalsPage<DexieActivity>({
  react: { useState, useMemo },
  useActivities,
  useGoals,
  goalRepository,
  syncEngine,
});
