import {
  type Provider,
  type UserProvider,
  createUserProviderEntity,
} from "@packages/domain/auth/userProviderSchema";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userProviders } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

export type UserProviderRepository<T = any> = {
  findUserProviderByIdAndProvider(
    provider: Provider,
    providerId: string,
  ): Promise<UserProvider | null>;
  createUserProvider(userProvider: UserProvider): Promise<UserProvider>;
  getUserProvidersByUserId(userId: string): Promise<UserProvider[]>;
  softDeleteByUserIdAndProvider(
    userId: string,
    provider: Provider,
  ): Promise<boolean>;
  withTx(tx: T): UserProviderRepository<T>;
};

export function newUserProviderRepository(
  db: QueryExecutor,
): UserProviderRepository<QueryExecutor> {
  return {
    findUserProviderByIdAndProvider: findUserProviderByIdAndProvider(db),
    createUserProvider: createUserProvider(db),
    getUserProvidersByUserId: getUserProvidersByUserId(db),
    softDeleteByUserIdAndProvider: softDeleteByUserIdAndProvider(db),
    withTx: (tx) => newUserProviderRepository(tx),
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

    try {
      return createUserProviderEntity({
        id: result.id,
        userId: result.userId,
        provider: result.provider as Provider,
        providerId: result.providerAccountId,
        email: result.email || undefined,
        type: "persisted",
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      });
    } catch (error) {
      console.error(
        "Failed to create UserProvider entity from DB result:",
        error,
      );
      return null;
    }
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

    return createUserProviderEntity({
      id: result.id,
      userId: result.userId,
      provider: result.provider as Provider,
      providerId: result.providerAccountId,
      email: result.email || undefined,
      type: "persisted",
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
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
    return results.map((result) =>
      createUserProviderEntity({
        id: result.id,
        userId: result.userId,
        provider: result.provider as Provider,
        providerId: result.providerAccountId,
        email: result.email || undefined,
        type: "persisted",
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }),
    );
  };
}

function softDeleteByUserIdAndProvider(db: QueryExecutor) {
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
