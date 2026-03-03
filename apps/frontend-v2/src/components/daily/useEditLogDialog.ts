import { useEffect, useState } from "react";

import { createUseEditLogDialog } from "@packages/frontend-shared/hooks/useEditLogDialog";

import { activityLogRepository } from "../../db/activityLogRepository";
import type { DexieActivityLog } from "../../db/schema";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { syncEngine } from "../../sync/syncEngine";

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
