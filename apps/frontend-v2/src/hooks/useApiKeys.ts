import { apiClient } from "../utils/apiClient";
import {
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks/useApiKeys";

export function useApiKeys() {
  return createUseApiKeys({ apiClient });
}

export function useCreateApiKey() {
  return createUseCreateApiKey({ apiClient });
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey({ apiClient });
}
