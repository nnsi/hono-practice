import { act } from "react";
import type { ReactNode } from "react";

import {
  renderHookWithActSync as renderHookWithAct,
  waitForWithAct,
} from "@frontend/test-utils";
import { apiClient } from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateApiKeyRequest } from "@dtos/request";
import type { CreateApiKeyResponse, GetApiKeysResponse } from "@dtos/response";

import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "../useApiKeys";

// モック
vi.mock("@frontend/utils/apiClient", () => {
  const mockApiClient = {
    users: {
      "api-keys": {
        $get: vi.fn(),
        $post: vi.fn(),
        ":id": {
          $delete: vi.fn(),
        },
      },
    },
  };
  return {
    apiClient: mockApiClient,
  };
});

describe("useApiKeys", () => {
  let queryClient: QueryClient;
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const createMockApiKey = (overrides?: Partial<any>) => ({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Test API Key",
    key: "act_test_xxxx...xxxx",
    isActive: true,
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
    lastUsedAt: null,
    ...overrides,
  });

  describe("useApiKeys", () => {
    it("APIキー一覧を正常に取得する", async () => {
      const mockApiKeys: GetApiKeysResponse = {
        apiKeys: [
          createMockApiKey({
            id: "00000000-0000-4000-8000-000000000001",
            name: "Production Key",
            key: "act_prod_xxxx...xxxx",
          }),
          createMockApiKey({
            id: "00000000-0000-4000-8000-000000000002",
            name: "Development Key",
            key: "act_dev_xxxx...xxxx",
            lastUsedAt: new Date("2024-01-15").toISOString(),
          }),
        ],
      };

      vi.mocked(mockApiClient.users["api-keys"].$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiKeys),
      } as any);

      const { result } = renderHookWithAct(() => useApiKeys(), {
        wrapper: createWrapper(),
      });

      // 初期状態を確認
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitForWithAct(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // データが正しく取得されていることを確認
      expect(result.current.data).toEqual(mockApiKeys);
      expect(result.current.data?.apiKeys).toHaveLength(2);
      expect(result.current.data?.apiKeys[0].name).toBe("Production Key");
    });

    it("空のAPIキー一覧を返す場合も正常に処理する", async () => {
      const mockApiKeys: GetApiKeysResponse = {
        apiKeys: [],
      };

      vi.mocked(mockApiClient.users["api-keys"].$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiKeys),
      } as any);

      const { result } = renderHookWithAct(() => useApiKeys(), {
        wrapper: createWrapper(),
      });

      await waitForWithAct(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.apiKeys).toEqual([]);
    });

    it("APIエラー時にエラー状態になる", async () => {
      vi.mocked(mockApiClient.users["api-keys"].$get).mockResolvedValue({
        ok: false,
        json: vi.fn(),
      } as any);

      const { result } = renderHookWithAct(() => useApiKeys(), {
        wrapper: createWrapper(),
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to fetch API keys");
    });

    it("パースエラー時に例外をスローする", async () => {
      vi.mocked(mockApiClient.users["api-keys"].$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ invalid: "data" }),
      } as any);

      const { result } = renderHookWithAct(() => useApiKeys(), {
        wrapper: createWrapper(),
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to parse API keys");
    });
  });

  describe("useCreateApiKey", () => {
    it("APIキーを正常に作成する", async () => {
      const newApiKeyData: CreateApiKeyRequest = {
        name: "New API Key",
      };

      const mockCreatedApiKey: CreateApiKeyResponse = {
        apiKey: {
          id: "00000000-0000-4000-8000-000000000003",
          name: "New API Key",
          key: "act_test_1234567890abcdef",
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
      };

      vi.mocked(mockApiClient.users["api-keys"].$post).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCreatedApiKey),
      } as any);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHookWithAct(() => useCreateApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newApiKeyData);
      });

      await waitForWithAct(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.users["api-keys"].$post).toHaveBeenCalledWith({
        json: newApiKeyData,
      });

      expect(result.current.data).toEqual(mockCreatedApiKey);
      expect(result.current.data?.apiKey.key).toBe("act_test_1234567890abcdef");

      // キャッシュが無効化されたことを確認
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["apiKeys"] });
    });

    it("APIエラー時にエラー状態になる", async () => {
      const newApiKeyData: CreateApiKeyRequest = {
        name: "New API Key",
      };

      vi.mocked(mockApiClient.users["api-keys"].$post).mockResolvedValue({
        ok: false,
        json: vi.fn(),
      } as any);

      const { result } = renderHookWithAct(() => useCreateApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newApiKeyData);
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to create API key");
    });

    it("バリデーションエラー時に例外をスローする", async () => {
      const invalidApiKeyData = {
        // nameが欠けている
      } as any;

      const { result } = renderHookWithAct(() => useCreateApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invalidApiKeyData);
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useDeleteApiKey", () => {
    it("APIキーを正常に削除する", async () => {
      const apiKeyId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(
        mockApiClient.users["api-keys"][":id"].$delete,
      ).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHookWithAct(() => useDeleteApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(apiKeyId);
      });

      await waitForWithAct(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(
        mockApiClient.users["api-keys"][":id"].$delete,
      ).toHaveBeenCalledWith({
        param: { id: apiKeyId },
      });

      // キャッシュが無効化されたことを確認
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["apiKeys"] });
    });

    it("APIエラー時にエラー状態になる", async () => {
      const apiKeyId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(
        mockApiClient.users["api-keys"][":id"].$delete,
      ).mockResolvedValue({
        ok: false,
        json: vi.fn(),
      } as any);

      const { result } = renderHookWithAct(() => useDeleteApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(apiKeyId);
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to delete API key");
    });

    it("ネットワークエラー時にエラー状態になる", async () => {
      const apiKeyId = "00000000-0000-4000-8000-000000000001";
      const mockError = new Error("Network error");

      vi.mocked(
        mockApiClient.users["api-keys"][":id"].$delete,
      ).mockRejectedValue(mockError);

      const { result } = renderHookWithAct(() => useDeleteApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(apiKeyId);
      });

      await waitForWithAct(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });
});
