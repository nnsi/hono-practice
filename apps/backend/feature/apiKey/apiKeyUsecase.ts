import type { ApiKey, CreateApiKeyData } from "@backend/domain";
import { createApiKeyId, generateApiKey } from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error/resourceNotFoundError";

import type { ApiKeyRepository } from "./apiKeyRepository";

export type ApiKeyUsecase = {
  createApiKey: (data: CreateApiKeyData) => Promise<ApiKey>; // throwする：DomainValidateError, SqlExecutionError
  listApiKeys: (userId: string) => Promise<ApiKey[]>; // throwする：SqlExecutionError
  deleteApiKey: (id: string, userId: string) => Promise<void>; // throwする：ResourceNotFoundError, SqlExecutionError
  validateApiKey: (key: string) => Promise<ApiKey | null>;
};

export function newApiKeyUsecase(
  apiKeyRepository: ApiKeyRepository,
): ApiKeyUsecase {
  return {
    createApiKey: createApiKey(apiKeyRepository),
    listApiKeys: listApiKeys(apiKeyRepository),
    deleteApiKey: deleteApiKey(apiKeyRepository),
    validateApiKey: validateApiKey(apiKeyRepository),
  };
}

function createApiKey(repo: ApiKeyRepository) {
  return async (data: CreateApiKeyData): Promise<ApiKey> => {
    const id = createApiKeyId();
    const key = generateApiKey();
    const apiKey = await repo.createApiKey({ id, ...data, key });
    return apiKey;
  };
}

function listApiKeys(repo: ApiKeyRepository) {
  return async (userId: string): Promise<ApiKey[]> => {
    const apiKeys = await repo.findApiKeyByUserId(userId);
    // ハッシュ化されたキーを固定のマスク表示に変換
    return apiKeys.map((apiKey) => ({
      ...apiKey,
      key: "api_****...****", // ハッシュ化後は元の値が分からないため固定表示
    }));
  };
}

function deleteApiKey(repo: ApiKeyRepository) {
  return async (id: string, userId: string): Promise<void> => {
    // ユーザーのAPIキーであることを確認（効率的にクエリ）
    const apiKey = await repo.findApiKeyById(id, userId);

    if (!apiKey) {
      throw new ResourceNotFoundError(`APIキーが見つかりません: ${id}`);
    }

    const deleted = await repo.softDeleteApiKey(id);
    if (!deleted) {
      throw new ResourceNotFoundError(`APIキーが見つかりません: ${id}`);
    }

    // TODO: KVストアからキャッシュを削除する実装を追加
  };
}

function validateApiKey(repo: ApiKeyRepository) {
  return async (key: string): Promise<ApiKey | null> => {
    // TODO: KVストアからキャッシュを確認する実装を追加

    // データベースから取得
    const apiKey = await repo.findApiKeyByKey(key);
    if (!apiKey || !apiKey.isActive) return null;

    // TODO: KVストアにキャッシュする実装を追加

    // 最終使用日時を更新（非同期で実行）
    // エラーが発生しても認証は成功させるが、監視ツールへの通知を推奨
    repo.updateApiKey(apiKey.id, { lastUsedAt: new Date() }).catch((error) => {
      // TODO: 監視ツール（Sentry、DataDogなど）への通知を実装
      console.error("Failed to update lastUsedAt for API key:", {
        apiKeyId: apiKey.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    });

    return apiKey;
  };
}
