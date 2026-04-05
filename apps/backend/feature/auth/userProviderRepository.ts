import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userProviders } from "@infra/drizzle/schema";
import {
  type Provider,
  type UserProvider,
  createUserProviderEntity,
  providerSchema,
} from "@packages/domain/auth/userProviderSchema";
import { and, eq, isNull } from "drizzle-orm";

type UserProviderRow = {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toUserProvider(row: UserProviderRow): UserProvider {
  return createUserProviderEntity({
    id: row.id,
    userId: row.userId,
    provider: providerSchema.parse(row.provider),
    providerId: row.providerAccountId,
    email: row.email || undefined,
    type: "persisted",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export type UserProviderRepository<T = QueryExecutor> = {
  findUserProviderByIdAndProvider(
    provider: Provider,
    providerId: string,
  ): Promise<UserProvider | null>;
  createUserProvider(userProvider: UserProvider): Promise<UserProvider>;
  getUserProvidersByUserId(userId: string): Promise<UserProvider[]>;
  softDeleteUserProvider(userId: string, provider: Provider): Promise<boolean>;
  hardDeleteUserProvidersByUserId(userId: string): Promise<number>;
  withTx(tx: T): UserProviderRepository<T>;
};

export function newUserProviderRepository(
  db: QueryExecutor,
): UserProviderRepository<QueryExecutor> {
  return {
    findUserProviderByIdAndProvider: findUserProviderByIdAndProvider(db),
    createUserProvider: createUserProvider(db),
    getUserProvidersByUserId: getUserProvidersByUserId(db),
    softDeleteUserProvider: softDeleteUserProvider(db),
    hardDeleteUserProvidersByUserId: hardDeleteUserProvidersByUserId(db),
    withTx: (tx) => newUserProviderRepository(tx),
  };
}

function hardDeleteUserProvidersByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<number> => {
    const result = await db
      .delete(userProviders)
      .where(eq(userProviders.userId, userId))
      .returning();
    return result.length;
  };
}

function findUserProviderByIdAndProvider(db: QueryExecutor) {
  return async (
    provider: Provider,
    providerId: string,
  ): Promise<UserProvider | null> => {
    const result = await db.query.userProviders.findFirst({
      where: and(
        eq(userProviders.provider, provider),
        eq(userProviders.providerAccountId, providerId),
        isNull(userProviders.deletedAt),
      ),
    });

    if (!result) {
      return null;
    }

    return toUserProvider(result);
  };
}

function createUserProvider(db: QueryExecutor) {
  return async (userProvider: UserProvider): Promise<UserProvider> => {
    const valuesToInsert = {
      id: userProvider.id,
      userId: userProvider.userId,
      provider: userProvider.provider,
      providerAccountId: userProvider.providerId,
      email: userProvider.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [result] = await db
      .insert(userProviders)
      .values(valuesToInsert)
      .returning();

    return toUserProvider(result);
  };
}

function getUserProvidersByUserId(db: QueryExecutor) {
  return async (userId: string): Promise<UserProvider[]> => {
    const results = await db.query.userProviders.findMany({
      where: and(
        eq(userProviders.userId, userId),
        isNull(userProviders.deletedAt),
      ),
    });
    return results.map(toUserProvider);
  };
}

function softDeleteUserProvider(db: QueryExecutor) {
  return async (userId: string, provider: Provider): Promise<boolean> => {
    const [result] = await db
      .update(userProviders)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(userProviders.userId, userId),
          eq(userProviders.provider, provider),
          isNull(userProviders.deletedAt),
        ),
      )
      .returning();

    return !!result;
  };
}
