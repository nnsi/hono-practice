import {
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks/useApiKeys";

import { apiClient } from "../utils/apiClient";

export function useApiKeys(options?: { enabled?: boolean }) {
  return createUseApiKeys({ apiClient, enabled: options?.enabled });
}

export function useCreateApiKey() {
  return createUseCreateApiKey({ apiClient });
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey({ apiClient });
}
