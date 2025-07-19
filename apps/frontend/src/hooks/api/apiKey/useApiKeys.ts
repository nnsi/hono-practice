import { apiClient } from "@frontend/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type CreateApiKeyRequest,
  CreateApiKeyRequestSchema,
} from "@dtos/request";
import {
  type CreateApiKeyResponse,
  type GetApiKeysResponse,
  GetApiKeysResponseSchema,
} from "@dtos/response";

export function useApiKeys() {
  return useQuery<GetApiKeysResponse>({
    queryKey: ["apiKeys"],
    queryFn: async () => {
      const res = await apiClient.users["api-keys"].$get();

      if (!res.ok) {
        throw new Error("Failed to fetch API keys");
      }

      const json = await res.json();
      const parsed = GetApiKeysResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("Failed to parse API keys");
      }

      return parsed.data;
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyRequest>({
    mutationFn: async (data: CreateApiKeyRequest) => {
      const validated = CreateApiKeyRequestSchema.parse(data);
      const res = await apiClient.users["api-keys"].$post({
        json: validated,
      });

      if (!res.ok) {
        throw new Error("Failed to create API key");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: async (id: string) => {
      const res = await apiClient.users["api-keys"][":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to delete API key");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });
}
