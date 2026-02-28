import { useState, useMemo } from "react";
import { createUseCreateGoalDialog } from "@packages/frontend-shared/hooks/useCreateGoalDialog";
import type { DexieActivity } from "../../db/schema";
import type { CreateGoalPayload } from "./types";

const useCreateGoalDialogBase = createUseCreateGoalDialog<DexieActivity>({
  react: { useState, useMemo },
});

export function useCreateGoalDialog(
  activities: DexieActivity[],
  onCreate: (payload: CreateGoalPayload) => Promise<void>,
) {
  const base = useCreateGoalDialogBase(activities, onCreate);
  return {
    ...base,
    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSubmit();
    },
  };
}
