import { useMemo, useState } from "react";

import { createUseTaskSchedulesTab } from "@packages/frontend-shared/hooks/useTaskSchedulesTab";

import { taskScheduleRepository } from "../../db/taskScheduleRepository";
import { useAllTaskSchedules } from "../../hooks/useTasks";
import { syncEngine } from "../../sync/syncEngine";

export const useTaskSchedulesTab = createUseTaskSchedulesTab({
  react: { useState, useMemo },
  useAllTaskSchedules,
  taskScheduleRepository,
  syncEngine,
});
