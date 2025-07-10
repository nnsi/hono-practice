import { type User, type UserId, createUserEntity } from "@backend/domain";
import { ConflictError } from "@backend/error";
import { users } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type UserRepository<T = any> = {
  createUser: (user: User) => Promise<User>;
  getUserById: (userId: UserId) => Promise<User | undefined>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
  withTx: (tx: T) => UserRepository<T>;
};

export function newUserRepository(
  db: QueryExecutor,
): UserRepository<QueryExecutor> {
  return {
    createUser: createUser(db),
    getUserById: getUserById(db),
    getUserByLoginId: getUserByLoginId(db),
    withTx: (tx) => newUserRepository(tx),
  };
}

function createUser(db: QueryExecutor) {
  return async (user: User) => {
    try {
      const [result] = await db
        .insert(users)
        .values({
          id: user.id as string,
          loginId: user.loginId ?? "",
          name: user.name ?? "",
          password: user.password,
        })
        .returning();

      const persistedUser = createUserEntity({ ...result, type: "persisted" });

      return persistedUser;
    } catch (error: any) {
      // PostgreSQLの一意制約違反エラーをチェック
      if (
        error.code === "23505" &&
        error.constraint === "user_login_id_unique"
      ) {
        throw new ConflictError("このログインIDは既に使用されています");
      }
      throw error;
    }
  };
}

function getUserById(db: QueryExecutor) {
  return async (userId: string) => {
    const result = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!result) {
      return undefined;
    }

    const user = createUserEntity({ ...result, type: "persisted" });

    return user;
  };
}

function getUserByLoginId(db: QueryExecutor) {
  return async (loginId: string) => {
    const result = await db.query.users.findFirst({
      where: eq(users.loginId, loginId),
    });

    if (!result) {
      return undefined;
    }

    const user = createUserEntity({ ...result, type: "persisted" });

    return user;
  };
}
