import {
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks/useApiKeys";
import type { CreateApiKeyRequest } from "@packages/types/request";

import { apiClient } from "../utils/apiClient";

async function fetchApiKeys() {
  const res = await apiClient.users["api-keys"].$get();

  if (!res.ok) {
    throw new Error("Failed to fetch API keys");
  }

  return res.json();
}

async function createApiKey(input: CreateApiKeyRequest) {
  const res = await apiClient.users["api-keys"].$post({
    json: input,
  });

  if (!res.ok) {
    throw new Error("Failed to create API key");
  }

  return res.json();
}

async function deleteApiKey(id: string) {
  const res = await apiClient.users["api-keys"][":id"].$delete({
    param: { id },
  });

  if (!res.ok) {
    throw new Error("Failed to delete API key");
  }

  return res.json();
}

export function useApiKeys(options?: { enabled?: boolean }) {
  return createUseApiKeys({
    enabled: options?.enabled,
    fetchApiKeys,
  });
}

export function useCreateApiKey() {
  return createUseCreateApiKey({
    createApiKey,
  });
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey({
    deleteApiKey,
  });
}
