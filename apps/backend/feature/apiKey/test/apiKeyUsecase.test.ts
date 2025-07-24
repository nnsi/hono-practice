import { createApiKeyId } from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error/resourceNotFoundError";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { newApiKeyUsecase } from "../apiKeyUsecase";

import type { ApiKeyRepository } from "../apiKeyRepository";
import type { ApiKey, CreateApiKeyData } from "@backend/domain";

describe("ApiKeyUsecase", () => {
  let repo: ApiKeyRepository;
  let usecase: ReturnType<typeof newApiKeyUsecase>;

  beforeEach(() => {
    repo = mock<ApiKeyRepository>();
    usecase = newApiKeyUsecase(instance(repo));
    reset(repo);
  });

  const userId = "00000000-0000-4000-8000-000000000000";
  const apiKeyId = "00000000-0000-4000-8000-000000000001";

  const mockApiKey: ApiKey = {
    id: createApiKeyId(apiKeyId),
    userId: userId,
    key: "test_key_1234567890abcdef",
    name: "Test API Key",
    lastUsedAt: null,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    deletedAt: null,
  };

  describe("createApiKey", () => {
    it("should create a new API key successfully", async () => {
      const createData: CreateApiKeyData = {
        userId: userId,
        name: "New API Key",
      };

      when(repo.createApiKey(anything())).thenResolve(mockApiKey);

      const result = await usecase.createApiKey(createData);

      expect(result).toEqual(mockApiKey);
      verify(repo.createApiKey(anything())).once();
    });
  });

  describe("listApiKeys", () => {
    it("should return masked API keys for a user", async () => {
      const apiKeys: ApiKey[] = [
        mockApiKey,
        {
          ...mockApiKey,
          id: createApiKeyId("00000000-0000-4000-8000-000000000002"),
          key: "another_key",
        },
      ];

      when(repo.findApiKeyByUserId(userId)).thenResolve(apiKeys);

      const result = await usecase.listApiKeys(userId);

      if (!Array.isArray(result)) {
        throw new Error("Expected array result");
      }

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("api_****...****"); // マスクされているか確認
      verify(repo.findApiKeyByUserId(userId)).once();
    });
  });

  describe("deleteApiKey", () => {
    it("should delete an API key successfully", async () => {
      when(repo.findApiKeyById(apiKeyId, userId)).thenResolve(mockApiKey);
      when(repo.softDeleteApiKey(apiKeyId)).thenResolve(true);

      await usecase.deleteApiKey(apiKeyId, userId);

      verify(repo.softDeleteApiKey(apiKeyId)).once();
    });

    it("should throw ResourceNotFoundError when API key not found", async () => {
      when(repo.findApiKeyById(apiKeyId, userId)).thenResolve(null);

      await expect(usecase.deleteApiKey(apiKeyId, userId)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });

    it("should throw ResourceNotFoundError when delete fails", async () => {
      when(repo.findApiKeyById(apiKeyId, userId)).thenResolve(mockApiKey);
      when(repo.softDeleteApiKey(apiKeyId)).thenResolve(false);

      await expect(usecase.deleteApiKey(apiKeyId, userId)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });

  describe("validateApiKey", () => {
    it("should validate an active API key successfully", async () => {
      when(repo.findApiKeyByKey(mockApiKey.key)).thenResolve(mockApiKey);
      // update メソッドが Promise を返すようにモック
      when(repo.updateApiKey(anything(), anything())).thenResolve(mockApiKey);

      const result = await usecase.validateApiKey(mockApiKey.key);

      expect(result).toEqual(mockApiKey);
      verify(repo.findApiKeyByKey(mockApiKey.key)).once();
      // Note: lastUsedAt更新は非同期で実行されるため、検証しない
    });

    it("should return null for non-existent API key", async () => {
      when(repo.findApiKeyByKey("non_existent_key")).thenResolve(null);

      const result = await usecase.validateApiKey("non_existent_key");

      expect(result).toBeNull();
      verify(repo.findApiKeyByKey("non_existent_key")).once();
    });

    it("should return null for inactive API key", async () => {
      const inactiveKey = { ...mockApiKey, isActive: false };
      when(repo.findApiKeyByKey(inactiveKey.key)).thenResolve(inactiveKey);

      const result = await usecase.validateApiKey(inactiveKey.key);

      expect(result).toBeNull();
      verify(repo.findApiKeyByKey(inactiveKey.key)).once();
    });

    it("should return null for deleted API key", async () => {
      const deletedKey = { ...mockApiKey, deletedAt: new Date("2024-01-02") };
      // 削除済みのキーはリポジトリから返されない（findByKeyがdeletedAtをチェックするため）
      when(repo.findApiKeyByKey(deletedKey.key)).thenResolve(null);

      const result = await usecase.validateApiKey(deletedKey.key);

      expect(result).toBeNull();
      verify(repo.findApiKeyByKey(deletedKey.key)).once();
    });
  });
});
