import type { AppType } from "@packages/api-contract";
import {
  type CreateApiKeyRequest,
  CreateApiKeyRequestSchema,
} from "@dtos/request";
import {
  type CreateApiKeyResponse,
  type GetApiKeysResponse,
  GetApiKeysResponseSchema,
} from "@dtos/response";
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type HonoClient = ReturnType<typeof import("hono/client").hc<AppType>>;

export type UseApiKeysOptions = {
  apiClient: HonoClient;
};

export type ApiKeyMutationOptions = {
  apiClient: HonoClient;
};

/**
 * APIキー一覧を取得する共通フック
 */
export function createUseApiKeys(
  options: UseApiKeysOptions,
): UseQueryResult<GetApiKeysResponse> {
  const { apiClient } = options;

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

/**
 * APIキー作成用の共通フック
 */
export function createUseCreateApiKey(
  options: ApiKeyMutationOptions,
): UseMutationResult<CreateApiKeyResponse, Error, CreateApiKeyRequest> {
  const { apiClient } = options;
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

/**
 * APIキー削除用の共通フック
 */
export function createUseDeleteApiKey(
  options: ApiKeyMutationOptions,
): UseMutationResult<unknown, Error, string> {
  const { apiClient } = options;
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
