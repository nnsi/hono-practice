import { hashApiKey } from "@backend/domain/apiKey";
import { apiKeys } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

import type {
  ApiKey,
  CreateApiKeyData,
  UpdateApiKeyData,
} from "@backend/domain/apiKey";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ApiKeyRepository<T = any> = {
  create: (data: CreateApiKeyData & { key: string }) => Promise<ApiKey>;
  findByUserId: (userId: string) => Promise<ApiKey[]>;
  findByKey: (key: string) => Promise<ApiKey | null>;
  findById: (id: string, userId: string) => Promise<ApiKey | null>;
  update: (id: string, data: UpdateApiKeyData) => Promise<ApiKey | null>;
  softDelete: (id: string) => Promise<boolean>;
  withTx: (tx: T) => ApiKeyRepository<T>;
};

export function newApiKeyRepository(
  db: QueryExecutor,
): ApiKeyRepository<QueryExecutor> {
  return {
    create: create(db),
    findByUserId: findByUserId(db),
    findByKey: findByKey(db),
    findById: findById(db),
    update: update(db),
    softDelete: softDelete(db),
    withTx: (tx) => newApiKeyRepository(tx),
  };
}

function create(db: QueryExecutor) {
  return async (data: CreateApiKeyData & { key: string }): Promise<ApiKey> => {
    // APIキーをハッシュ化して保存
    const hashedKey = await hashApiKey(data.key);

    const [result] = await db
      .insert(apiKeys)
      .values({
        userId: data.userId,
        key: hashedKey,
        name: data.name,
      })
      .returning();

    return {
      id: result.id,
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

function findByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<ApiKey[]> => {
    const results = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.deletedAt)));

    return results.map((result) => ({
      id: result.id,
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

function findByKey(db: QueryExecutor) {
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
      id: result.id,
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

function findById(db: QueryExecutor) {
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
      id: result.id,
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

function update(db: QueryExecutor) {
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
      id: result.id,
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

function softDelete(db: QueryExecutor) {
  return async (id: string): Promise<boolean> => {
    const [result] = await db
      .update(apiKeys)
      .set({ deletedAt: new Date() })
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.deletedAt)))
      .returning();

    return !!result;
  };
}
