import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { apiKeys } from "@infra/drizzle/schema";
import type {
  ApiKey,
  ApiKeyId,
  ApiKeyScope,
  CreateApiKeyData,
  UpdateApiKeyData,
} from "@packages/domain/apiKey/apiKeySchema";
import {
  API_KEY_SCOPES,
  createApiKeyId,
  hashApiKey,
} from "@packages/domain/apiKey/apiKeySchema";
import { and, eq, isNull } from "drizzle-orm";

const apiKeyScopeSet = new Set<string>(API_KEY_SCOPES);
function toApiKeyScopes(scopes: string[] | null): ApiKeyScope[] {
  return (scopes ?? ["all"]).filter((s): s is ApiKeyScope =>
    apiKeyScopeSet.has(s),
  );
}

type ApiKeyRow = typeof apiKeys.$inferSelect;

function toApiKey(row: ApiKeyRow, keyOverride?: string): ApiKey {
  return {
    id: createApiKeyId(row.id),
    userId: row.userId,
    key: keyOverride ?? row.key,
    name: row.name,
    scopes: toApiKeyScopes(row.scopes),
    lastUsedAt: row.lastUsedAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export type ApiKeyRepository<T = QueryExecutor> = {
  createApiKey: (
    data: CreateApiKeyData & { id: ApiKeyId; key: string },
  ) => Promise<ApiKey>;
  findApiKeyByUserId: (userId: string) => Promise<ApiKey[]>;
  findApiKeyByKey: (key: string) => Promise<ApiKey | null>;
  findApiKeyById: (id: string, userId: string) => Promise<ApiKey | null>;
  updateApiKey: (id: string, data: UpdateApiKeyData) => Promise<ApiKey | null>;
  softDeleteApiKey: (id: string) => Promise<boolean>;
  hardDeleteApiKeysByUserId: (userId: string) => Promise<number>;
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
    hardDeleteApiKeysByUserId: hardDeleteApiKeysByUserId(db),
    withTx: (tx) => newApiKeyRepository(tx),
  };
}

function hardDeleteApiKeysByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<number> => {
    const result = await db
      .delete(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .returning();
    return result.length;
  };
}

function createApiKey(db: QueryExecutor) {
  return async (
    data: CreateApiKeyData & { id: ApiKeyId; key: string },
  ): Promise<ApiKey> => {
    const hashedKey = await hashApiKey(data.key);

    const [result] = await db
      .insert(apiKeys)
      .values({
        id: data.id,
        userId: data.userId,
        key: hashedKey,
        name: data.name,
        scopes: data.scopes ?? ["all"],
      })
      .returning();

    return toApiKey(result, data.key);
  };
}

function findApiKeyByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<ApiKey[]> => {
    const results = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.deletedAt)));

    return results.map((result) => toApiKey(result));
  };
}

function findApiKeyByKey(db: QueryExecutor) {
  return async (key: string): Promise<ApiKey | null> => {
    const hashedKey = await hashApiKey(key);

    const [result] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, hashedKey), isNull(apiKeys.deletedAt)))
      .limit(1);

    if (!result) {
      return null;
    }

    return toApiKey(result);
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

    return toApiKey(result);
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

    return toApiKey(result);
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
