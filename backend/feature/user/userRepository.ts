import { eq, and } from "drizzle-orm";

import { User } from "@/backend/domain/model/user";
import { type DrizzleClient } from "@/backend/lib/drizzle";
import { users } from "@/drizzle/schema";
import { CreateUserRequest } from "@/types/request";

export type UserRepository = {
  createUser: (params: CreateUserRequest) => Promise<User>;
  getUserById: (userId: string) => Promise<User | undefined>;
};

export function newUserRepository(db: DrizzleClient): UserRepository {
  return {
    createUser: createUser(db),
    getUserById: getUserById(db),
  };
}

function createUser(db: DrizzleClient) {
  return async function (params: CreateUserRequest) {
    const result = await db
      .insert(users)
      .values({
        loginId: params.loginId,
        name: params.name,
        password: params.password,
      })
      .returning();

    return result[0];
  };
}

function getUserById(db: DrizzleClient) {
  return async function (userId: string) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId)))
      .execute();

    return result.length > 0 ? result[0] : undefined;
  };
}
