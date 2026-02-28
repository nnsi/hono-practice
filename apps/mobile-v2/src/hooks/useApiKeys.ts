import { apiClient } from "../utils/apiClient";
import {
  type UseApiKeysOptions,
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks/useApiKeys";

const opts = { apiClient } as UseApiKeysOptions;

export function useApiKeys() {
  return createUseApiKeys(opts);
}

export function useCreateApiKey() {
  return createUseCreateApiKey(opts);
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey(opts);
}
