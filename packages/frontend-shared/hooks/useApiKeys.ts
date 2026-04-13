import {
  type CreateApiKeyRequest,
  CreateApiKeyRequestSchema,
} from "@packages/types/request";
import {
  type CreateApiKeyResponse,
  type GetApiKeysResponse,
  GetApiKeysResponseSchema,
} from "@packages/types/response";
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type UseApiKeysOptions = {
  fetchApiKeys: () => Promise<unknown>;
  enabled?: boolean;
};

export type ApiKeyMutationOptions = {
  createApiKey: (input: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
};

export type DeleteApiKeyMutationOptions = {
  deleteApiKey: (id: string) => Promise<unknown>;
};

/**
 * APIキー一覧を取得する共通フック
 */
export function createUseApiKeys(
  options: UseApiKeysOptions,
): UseQueryResult<GetApiKeysResponse> {
  const { fetchApiKeys, enabled } = options;

  return useQuery<GetApiKeysResponse>({
    queryKey: ["apiKeys"],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const json = await fetchApiKeys();
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
  const { createApiKey } = options;
  const queryClient = useQueryClient();

  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyRequest>({
    mutationFn: async (data: CreateApiKeyRequest) => {
      const validated = CreateApiKeyRequestSchema.parse(data);
      return createApiKey(validated);
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
  options: DeleteApiKeyMutationOptions,
): UseMutationResult<unknown, Error, string> {
  const { deleteApiKey } = options;
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });
}
