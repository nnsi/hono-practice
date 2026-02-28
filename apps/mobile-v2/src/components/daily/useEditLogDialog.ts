import { useState, useEffect } from "react";
import { createUseEditLogDialog } from "@packages/frontend-shared/hooks/useEditLogDialog";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

export const useEditLogDialog = createUseEditLogDialog({
  react: { useState, useEffect },
  useActivityKinds,
  activityLogRepository,
  syncEngine,
});
