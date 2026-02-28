import { useState, useMemo } from "react";
import { createUseCreateGoalDialog } from "@packages/frontend-shared/hooks/useCreateGoalDialog";
import type { Activity } from "./types";

export const useCreateGoalDialog = createUseCreateGoalDialog<Activity>({
  react: { useState, useMemo },
});
