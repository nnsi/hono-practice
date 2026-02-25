import { type User, type UserId, createUserEntity } from "@packages/domain/user/userSchema";
import { ConflictError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { users } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

export type UserRepository<T = any> = {
  createUser: (user: User) => Promise<User>;
  getUserById: (userId: UserId) => Promise<User | undefined>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
  deleteUser: (userId: UserId) => Promise<void>;
  withTx: (tx: T) => UserRepository<T>;
};

export function newUserRepository(
  db: QueryExecutor,
): UserRepository<QueryExecutor> {
  return {
    createUser: createUser(db),
    getUserById: getUserById(db),
    getUserByLoginId: getUserByLoginId(db),
    deleteUser: deleteUser(db),
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
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
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
      where: and(eq(users.loginId, loginId), isNull(users.deletedAt)),
    });

    if (!result) {
      return undefined;
    }

    const user = createUserEntity({ ...result, type: "persisted" });

    return user;
  };
}

function deleteUser(db: QueryExecutor) {
  return async (userId: string) => {
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  };
}
