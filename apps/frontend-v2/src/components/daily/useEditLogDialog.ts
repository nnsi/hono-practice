import { useState, useEffect } from "react";
import { createUseEditLogDialog } from "@packages/frontend-shared/hooks/useEditLogDialog";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivityLog } from "../../db/schema";

const useEditLogDialogBase = createUseEditLogDialog({
  react: { useState, useEffect },
  useActivityKinds,
  activityLogRepository,
  syncEngine,
});

export function useEditLogDialog(log: DexieActivityLog, onClose: () => void) {
  const base = useEditLogDialogBase(log, onClose);
  return {
    ...base,
    handleSave: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSave();
    },
  };
}
