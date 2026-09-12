import { useState } from "react";

import { createUseTaskQuickAdd } from "@packages/frontend-shared/hooks/useTaskQuickAdd";

import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { reportError } from "../../utils/errorReporter";

export const useTaskQuickAdd = createUseTaskQuickAdd({
  react: { useState },
  taskRepository,
  syncEngine,
  onError: (error) =>
    reportError({
      errorType: "unhandled_error",
      message: `Task quick add failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    }),
});
