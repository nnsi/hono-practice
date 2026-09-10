import type { SyncTaskSchedulesRequest } from "@packages/types/sync/request/taskSchedule";

import { apiClient } from "./apiClient";

export const getTaskSchedules = (query: { since?: string }) =>
  apiClient.users.v2["task-schedules"].$get({ query });

export const postTaskSchedules = (json: SyncTaskSchedulesRequest) =>
  apiClient.users.v2["task-schedules"].sync.$post({ json });
