import { useState } from "react";

import { vi } from "vitest";

import { createUseTaskCreateDialog } from "./useTaskCreateDialog";

/** `useTaskCreateDialog` テストの共通セットアップ（mock と hook 生成）。テスト側で `vi.clearAllMocks()` すること */
export function createTaskCreateDialogHarness() {
  const mocks = {
    createTask: vi.fn().mockResolvedValue(undefined),
    createTaskSchedule: vi.fn().mockResolvedValue(undefined),
    syncTasks: vi.fn(),
    syncTaskSchedules: vi.fn(),
    onSuccess: vi.fn(),
  };
  const useTaskCreateDialog = createUseTaskCreateDialog({
    react: { useState },
    taskRepository: { createTask: mocks.createTask },
    taskScheduleRepository: { createTaskSchedule: mocks.createTaskSchedule },
    syncEngine: {
      syncTasks: mocks.syncTasks,
      syncTaskSchedules: mocks.syncTaskSchedules,
    },
  });
  return { ...mocks, useTaskCreateDialog };
}
