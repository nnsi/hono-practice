import { eq, and } from "drizzle-orm";

import { User } from "@/backend/domain";
import { type DrizzleInstance } from "@/backend/infra/drizzle/drizzleInstance";
import { users } from "@/drizzle/schema";

export type UserRepository = {
  createUser: (user: User) => Promise<User>;
  getUserById: (userId: string) => Promise<User | undefined>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
};

export function newUserRepository(db: DrizzleInstance): UserRepository {
  return {
    createUser: createUser(db),
    getUserById: getUserById(db),
    getUserByLoginId: getUserByLoginId(db),
  };
}

function createUser(db: DrizzleInstance) {
  return async function (user: User) {
    const result = await db
      .insert(users)
      .values({
        loginId: user.loginId,
        name: user.name,
        password: user.password,
      })
      .returning();

    return result[0];
  };
}

function getUserById(db: DrizzleInstance) {
  return async function (userId: string) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId)))
      .execute();

    return result.length > 0 ? result[0] : undefined;
  };
}

function getUserByLoginId(db: DrizzleInstance) {
  return async function (loginId: string) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.loginId, loginId)))
      .execute();

    return result.length > 0 ? result[0] : undefined;
  };
}
