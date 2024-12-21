import { eq, and } from "drizzle-orm";

import { User, UserId } from "@/backend/domain";
import { type QueryExecutor } from "@/backend/infra/drizzle/drizzleInstance";
import { users } from "@/drizzle/schema";

export type UserRepository = {
  createUser: (user: User) => Promise<User>;
  getUserById: (userId: UserId) => Promise<User | undefined>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
};

export function newUserRepository(db: QueryExecutor): UserRepository {
  return {
    createUser: createUser(db),
    getUserById: getUserById(db),
    getUserByLoginId: getUserByLoginId(db),
  };
}

function createUser(db: QueryExecutor) {
  return async function (user: User) {
    const result = await db
      .insert(users)
      .values({
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        password: user.password,
      })
      .returning();

    const persistedUser = User.create(result[0]);

    return persistedUser;
  };
}

function getUserById(db: QueryExecutor) {
  return async function (userId: string) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId)))
      .execute();

    if (result.length === 0) {
      return undefined;
    }

    const user = User.create(result[0]);

    return user;
  };
}

function getUserByLoginId(db: QueryExecutor) {
  return async function (loginId: string) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.loginId, loginId)))
      .execute();

    if (result.length === 0) {
      return undefined;
    }

    const user = User.create(result[0]);

    return user;
  };
}
