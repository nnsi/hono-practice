import { useMemo, useState } from "react";

import type { TaskItem } from "@packages/domain/task/types";
import {
  type TaskScheduleRecord,
  createScheduledTaskId,
} from "@packages/domain/taskSchedule";
import { vi } from "vitest";

import { getToday } from "../utils/dateUtils";
import { createUseTasksPage } from "./useTasksPage";

export const today = getToday();
export const virtualId = createScheduledTaskId("schedule-1", today);

/** 毎日該当する（intervalDays=1, startDate=today）スケジュール */
export const schedule: TaskScheduleRecord = {
  id: "schedule-1",
  userId: "user-1",
  activityId: "act-1",
  activityKindId: "kind-1",
  quantity: 5,
  title: "Bench press",
  memo: "",
  recurrenceType: "interval",
  intervalDays: 1,
  weekdays: null,
  startDate: today,
  endDate: null,
  isActive: true,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  deletedAt: null,
};

export const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "Real task",
  startDate: today,
  dueDate: null,
  doneDate: null,
  memo: "",
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  ...overrides,
});

/** 仮想タスク系テストの共通ハーネス。`state` を書き換えて表示データを差し替える */
export function createVirtualTasksPageHarness() {
  const tasksOnDate: Pick<TaskItem, "scheduleId" | "scheduledDate">[] = [];
  const state = {
    activeTasks: [makeTask()],
    tasksOnDate,
  };
  const mocks = {
    createTask: vi.fn().mockResolvedValue(undefined),
    getTasksByScheduledDate: vi.fn().mockResolvedValue([]),
    updateTask: vi.fn().mockResolvedValue(undefined),
    softDeleteTask: vi.fn().mockResolvedValue(undefined),
    archiveTask: vi.fn().mockResolvedValue(undefined),
    createActivityLog: vi.fn().mockResolvedValue(undefined),
    softDeleteActivityLogByTaskId: vi.fn().mockResolvedValue(undefined),
  };
  const useTasksPage = createUseTasksPage({
    react: { useState, useMemo },
    useActiveTasks: () => ({ tasks: state.activeTasks }),
    useArchivedTasks: () => ({ tasks: [] }),
    useActiveTaskSchedules: () => ({ schedules: [schedule] }),
    useTasksOnScheduledDate: () => ({ tasks: state.tasksOnDate }),
    taskRepository: mocks,
    activityLogRepository: mocks,
    syncEngine: {
      syncTasks: vi.fn().mockResolvedValue(undefined),
      syncActivityLogs: vi.fn().mockResolvedValue(undefined),
    },
  });
  const reset = () => {
    vi.clearAllMocks();
    state.activeTasks = [makeTask()];
    state.tasksOnDate = [];
  };
  return { state, mocks, useTasksPage, reset };
}
