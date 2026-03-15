import { useMemo, useState } from "react";

import { createUseGoalsPage } from "@packages/frontend-shared/hooks/useGoalsPage";

import { goalRepository } from "../../db/goalRepository";
import type { DexieActivity } from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { useGoals } from "../../hooks/useGoals";
import { syncEngine } from "../../sync/syncEngine";

export const useGoalsPage = createUseGoalsPage<DexieActivity>({
  react: { useState, useMemo },
  useActivities,
  useGoals,
  goalRepository,
  syncEngine,
});
