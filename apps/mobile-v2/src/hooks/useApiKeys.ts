import {
  type UseApiKeysOptions,
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks/useApiKeys";

import { apiClient } from "../utils/apiClient";

const opts = { apiClient } as UseApiKeysOptions;

export function useApiKeys(options?: { enabled?: boolean }) {
  return createUseApiKeys({ ...opts, enabled: options?.enabled });
}

export function useCreateApiKey() {
  return createUseCreateApiKey(opts);
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey(opts);
}
