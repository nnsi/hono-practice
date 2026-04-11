import { ResourceNotFoundError } from "@backend/error/resourceNotFoundError";
import { type Logger, noopLogger } from "@backend/lib/logger";
import type { Tracer } from "@backend/lib/tracer";
import type {
  ApiKey,
  CreateApiKeyData,
} from "@packages/domain/apiKey/apiKeySchema";
import {
  createApiKeyId,
  generateApiKey,
} from "@packages/domain/apiKey/apiKeySchema";

import type { ApiKeyRepository } from "./apiKeyRepository";

export type ApiKeyUsecase = {
  createApiKey: (data: CreateApiKeyData) => Promise<ApiKey>; // throwする：DomainValidateError
  listApiKeys: (userId: string) => Promise<ApiKey[]>;
  deleteApiKey: (id: string, userId: string) => Promise<void>; // throwする：ResourceNotFoundError
  validateApiKey: (key: string) => Promise<ApiKey | null>;
};

export function newApiKeyUsecase(
  apiKeyRepository: ApiKeyRepository,
  tracer: Tracer,
  logger: Logger = noopLogger,
): ApiKeyUsecase {
  const apiKeyLogger = logger.child({ feature: "apiKeyUsecase" });
  return {
    createApiKey: createApiKey(apiKeyRepository, tracer),
    listApiKeys: listApiKeys(apiKeyRepository, tracer),
    deleteApiKey: deleteApiKey(apiKeyRepository, tracer),
    validateApiKey: validateApiKey(apiKeyRepository, tracer, apiKeyLogger),
  };
}

function createApiKey(repo: ApiKeyRepository, tracer: Tracer) {
  return async (data: CreateApiKeyData): Promise<ApiKey> => {
    const id = createApiKeyId();
    const key = generateApiKey();
    const apiKey = await tracer.span("db.createApiKey", () =>
      repo.createApiKey({ id, ...data, key, scopes: data.scopes ?? ["all"] }),
    );
    return apiKey;
  };
}

function listApiKeys(repo: ApiKeyRepository, tracer: Tracer) {
  return async (userId: string): Promise<ApiKey[]> => {
    const apiKeys = await tracer.span("db.findApiKeyByUserId", () =>
      repo.findApiKeyByUserId(userId),
    );
    // ハッシュ化されたキーを固定のマスク表示に変換
    return apiKeys.map((apiKey) => ({
      ...apiKey,
      key: "api_****...****", // ハッシュ化後は元の値が分からないため固定表示
    }));
  };
}

function deleteApiKey(repo: ApiKeyRepository, tracer: Tracer) {
  return async (id: string, userId: string): Promise<void> => {
    // ユーザーのAPIキーであることを確認（効率的にクエリ）
    const apiKey = await tracer.span("db.findApiKeyById", () =>
      repo.findApiKeyById(id, userId),
    );

    if (!apiKey) {
      throw new ResourceNotFoundError(`APIキーが見つかりません: ${id}`);
    }

    const deleted = await tracer.span("db.softDeleteApiKey", () =>
      repo.softDeleteApiKey(id),
    );
    if (!deleted) {
      throw new ResourceNotFoundError(`APIキーが見つかりません: ${id}`);
    }

    // API key validation is intentionally DB-only.
    // Avoid caching hashed credentials until we have a dedicated invalidation design.
  };
}

function validateApiKey(
  repo: ApiKeyRepository,
  tracer: Tracer,
  logger: Logger,
) {
  return async (key: string): Promise<ApiKey | null> => {
    // API key validation is intentionally DB-only.
    const apiKey = await tracer.span("db.findApiKeyByKey", () =>
      repo.findApiKeyByKey(key),
    );
    if (!apiKey || !apiKey.isActive) return null;

    // 最終使用日時を更新（fire-and-forget: リクエスト完了後に実行されるためtracer計測対象外）
    repo.updateApiKey(apiKey.id, { lastUsedAt: new Date() }).catch((error) => {
      logger.error("Failed to update api key lastUsedAt", {
        apiKeyId: apiKey.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    });

    return apiKey;
  };
}
