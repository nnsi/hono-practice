import { useMemo, useState } from "react";

import { createUseTaskSchedulesTab } from "@packages/frontend-shared/hooks/useTaskSchedulesTab";

import { useAllTaskSchedules } from "../../hooks/useTasks";
import { taskScheduleRepository } from "../../repositories/taskScheduleRepository";
import { syncEngine } from "../../sync/syncEngine";

export const useTaskSchedulesTab = createUseTaskSchedulesTab({
  react: { useState, useMemo },
  useAllTaskSchedules,
  taskScheduleRepository,
  syncEngine,
});
