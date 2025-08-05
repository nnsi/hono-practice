import {
  createUseActivityLogs,
  createUseCreateActivityLog,
  createUseDeleteActivityLog,
  createUseUpdateActivityLog,
} from "@packages/frontend-shared/hooks/useActivityLogs";

import { apiClient } from "../utils/apiClient";

export function useActivityLogs(date: Date, options?: { enabled?: boolean }) {
  return createUseActivityLogs({
    apiClient,
    date,
    enabled: options?.enabled,
  });
}

export function useCreateActivityLog() {
  return createUseCreateActivityLog({ apiClient });
}

export function useUpdateActivityLog() {
  return createUseUpdateActivityLog({ apiClient });
}

export function useDeleteActivityLog() {
  return createUseDeleteActivityLog({ apiClient });
}
