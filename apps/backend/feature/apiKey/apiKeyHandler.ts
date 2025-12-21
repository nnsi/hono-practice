import type { UserId } from "@backend/domain";
import { AppError } from "@backend/error";
import type { CreateApiKeyRequest } from "@dtos/request";
import {
  CreateApiKeyResponseSchema,
  GetApiKeysResponseSchema,
} from "@dtos/response";

import type { ApiKeyUsecase } from "./apiKeyUsecase";

export function newApiKeyHandler(uc: ApiKeyUsecase) {
  return {
    getApiKeys: getApiKeys(uc),
    createApiKey: createApiKey(uc),
    deleteApiKey: deleteApiKey(uc),
  };
}

function getApiKeys(uc: ApiKeyUsecase) {
  return async (userId: UserId) => {
    const result = await uc.listApiKeys(userId);

    // 日付をISO文字列に変換
    const apiKeysResponse = result.map((apiKey) => ({
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key, // 既にマスクされている
      lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    }));

    const parsedResponse = GetApiKeysResponseSchema.safeParse({
      apiKeys: apiKeysResponse,
    });
    if (!parsedResponse.success) {
      throw new AppError("Invalid response format", 500);
    }

    return parsedResponse.data;
  };
}

function createApiKey(uc: ApiKeyUsecase) {
  return async (userId: UserId, params: CreateApiKeyRequest) => {
    const result = await uc.createApiKey({
      userId: userId,
      name: params.name,
    });

    const apiKeyResponse = {
      id: result.id,
      name: result.name,
      key: result.key, // 作成時は完全なキーを返す
      lastUsedAt: result.lastUsedAt ? result.lastUsedAt.toISOString() : null,
      isActive: result.isActive,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    const parsedResponse = CreateApiKeyResponseSchema.safeParse({
      apiKey: apiKeyResponse,
    });
    if (!parsedResponse.success) {
      throw new AppError("Invalid response format", 500);
    }

    return parsedResponse.data;
  };
}

function deleteApiKey(uc: ApiKeyUsecase) {
  return async (userId: UserId, id: string) => {
    await uc.deleteApiKey(id, userId);
  };
}
