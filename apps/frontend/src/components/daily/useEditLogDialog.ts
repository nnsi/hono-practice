import { useEffect, useState } from "react";

import type { ActivityLogBase } from "@packages/frontend-shared/hooks/types";
import { createUseEditLogDialog } from "@packages/frontend-shared/hooks/useEditLogDialog";

import { activityLogRepository } from "../../db/activityLogRepository";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { syncEngine } from "../../sync/syncEngine";

const useEditLogDialogBase = createUseEditLogDialog({
  react: { useState, useEffect },
  useActivityKinds,
  activityLogRepository,
  syncEngine,
});

export function useEditLogDialog(log: ActivityLogBase, onClose: () => void) {
  const base = useEditLogDialogBase(log, onClose);
  return {
    ...base,
    handleSave: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSave();
    },
  };
}
