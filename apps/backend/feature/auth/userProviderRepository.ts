import {
  type Provider,
  type UserProvider,
  createUserProviderEntity,
} from "@backend/domain";
import { userProviders } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type UserProviderRepository = {
  findUserProviderByIdAndProvider(
    provider: Provider,
    providerId: string,
  ): Promise<UserProvider | null>;
  createUserProvider(userProvider: UserProvider): Promise<UserProvider>;
  getUserProvidersByUserId(userId: string): Promise<UserProvider[]>;
  withTx(tx: any): UserProviderRepository;
};

export function newUserProviderRepository(
  db: QueryExecutor,
): UserProviderRepository {
  return {
    findUserProviderByIdAndProvider: findUserProviderByIdAndProvider(db),
    createUserProvider: createUserProvider(db),
    getUserProvidersByUserId: getUserProvidersByUserId(db),
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
        type: "persisted",
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }),
    );
  };
}
