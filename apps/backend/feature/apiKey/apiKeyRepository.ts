import type {
  ApiKey,
  ApiKeyId,
  CreateApiKeyData,
  UpdateApiKeyData,
} from "@backend/domain";
import { createApiKeyId, hashApiKey } from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { apiKeys } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

export type ApiKeyRepository<T = any> = {
  createApiKey: (
    data: CreateApiKeyData & { id: ApiKeyId; key: string },
  ) => Promise<ApiKey>;
  findApiKeyByUserId: (userId: string) => Promise<ApiKey[]>;
  findApiKeyByKey: (key: string) => Promise<ApiKey | null>;
  findApiKeyById: (id: string, userId: string) => Promise<ApiKey | null>;
  updateApiKey: (id: string, data: UpdateApiKeyData) => Promise<ApiKey | null>;
  softDeleteApiKey: (id: string) => Promise<boolean>;
  withTx: (tx: T) => ApiKeyRepository<T>;
};

export function newApiKeyRepository(
  db: QueryExecutor,
): ApiKeyRepository<QueryExecutor> {
  return {
    createApiKey: createApiKey(db),
    findApiKeyByUserId: findApiKeyByUserId(db),
    findApiKeyByKey: findApiKeyByKey(db),
    findApiKeyById: findApiKeyById(db),
    updateApiKey: updateApiKey(db),
    softDeleteApiKey: softDeleteApiKey(db),
    withTx: (tx) => newApiKeyRepository(tx),
  };
}

function createApiKey(db: QueryExecutor) {
  return async (
    data: CreateApiKeyData & { id: ApiKeyId; key: string },
  ): Promise<ApiKey> => {
    // APIキーをハッシュ化して保存
    const hashedKey = await hashApiKey(data.key);

    const [result] = await db
      .insert(apiKeys)
      .values({
        id: data.id,
        userId: data.userId,
        key: hashedKey,
        name: data.name,
      })
      .returning();

    return {
      id: createApiKeyId(result.id),
      userId: result.userId,
      key: data.key, // 生成時は平文のキーを返す
      name: result.name,
      lastUsedAt: result.lastUsedAt,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    };
  };
}

function findApiKeyByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<ApiKey[]> => {
    const results = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.deletedAt)));

    return results.map((result) => ({
      id: createApiKeyId(result.id),
      userId: result.userId,
      key: result.key,
      name: result.name,
      lastUsedAt: result.lastUsedAt,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    }));
  };
}

function findApiKeyByKey(db: QueryExecutor) {
  return async (key: string): Promise<ApiKey | null> => {
    // 検索時もハッシュ化して比較
    const hashedKey = await hashApiKey(key);

    const [result] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, hashedKey), isNull(apiKeys.deletedAt)))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: createApiKeyId(result.id),
      userId: result.userId,
      key: result.key, // ハッシュ化されたキーを返す（後でマスク処理される）
      name: result.name,
      lastUsedAt: result.lastUsedAt,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    };
  };
}

function findApiKeyById(db: QueryExecutor) {
  return async (id: string, userId: string): Promise<ApiKey | null> => {
    const [result] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.userId, userId),
          isNull(apiKeys.deletedAt),
        ),
      )
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: createApiKeyId(result.id),
      userId: result.userId,
      key: result.key, // ハッシュ化されたキー
      name: result.name,
      lastUsedAt: result.lastUsedAt,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    };
  };
}

function updateApiKey(db: QueryExecutor) {
  return async (id: string, data: UpdateApiKeyData): Promise<ApiKey | null> => {
    const [result] = await db
      .update(apiKeys)
      .set(data)
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.deletedAt)))
      .returning();

    if (!result) {
      return null;
    }

    return {
      id: createApiKeyId(result.id),
      userId: result.userId,
      key: result.key,
      name: result.name,
      lastUsedAt: result.lastUsedAt,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      deletedAt: result.deletedAt,
    };
  };
}

function softDeleteApiKey(db: QueryExecutor) {
  return async (id: string): Promise<boolean> => {
    const [result] = await db
      .update(apiKeys)
      .set({ deletedAt: new Date() })
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.deletedAt)))
      .returning();

    return !!result;
  };
}
