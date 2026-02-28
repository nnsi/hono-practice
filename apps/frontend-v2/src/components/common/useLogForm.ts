import { useState } from "react";
import { createUseLogForm } from "@packages/frontend-shared/hooks/useLogForm";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity } from "../../db/schema";

export type UseTimerReturn = ReturnType<typeof useTimer>;

const useLogFormBase = createUseLogForm({
  react: { useState },
  useActivityKinds,
  useTimer,
  activityLogRepository,
  syncEngine,
});

export function useLogForm(
  activity: DexieActivity,
  date: string,
  onDone: () => void,
) {
  const base = useLogFormBase(activity, date, onDone);
  return {
    ...base,
    handleManualSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      return base.handleManualSubmit();
    },
  };
}
