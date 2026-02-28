import { useState } from "react";
import { createUseLogForm } from "@packages/frontend-shared/hooks/useLogForm";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

export type UseTimerReturn = ReturnType<typeof useTimer>;

export const useLogForm = createUseLogForm({
  react: { useState },
  useActivityKinds,
  useTimer,
  activityLogRepository,
  syncEngine,
});
