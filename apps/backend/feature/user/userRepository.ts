import { ConflictError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { users } from "@infra/drizzle/schema";
import {
  type User,
  type UserId,
  createUserEntity,
} from "@packages/domain/user/userSchema";
import { and, count, desc, eq, isNull } from "drizzle-orm";

export type UserRepository<T = QueryExecutor> = {
  createUser: (user: User) => Promise<User>;
  getUserById: (userId: UserId) => Promise<User | undefined>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
  deleteUser: (userId: UserId) => Promise<void>;
  listUsers: (
    limit: number,
    offset: number,
  ) => Promise<{
    items: {
      id: string;
      loginId: string;
      name: string | null;
      createdAt: Date;
    }[];
    total: number;
  }>;
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
    listUsers: listUsers(db),
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
    } catch (error: unknown) {
      // PostgreSQLの一意制約違反エラーをチェック
      if (
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505" &&
        "constraint" in error &&
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

function listUsers(db: QueryExecutor) {
  return async (limit: number, offset: number) => {
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          loginId: users.loginId,
          name: users.name,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(isNull(users.deletedAt)),
    ]);

    return { items, total };
  };
}
