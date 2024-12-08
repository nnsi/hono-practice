import { eq, and } from "drizzle-orm";

import { drizzle } from "@/backend/lib/drizzle";
import { users } from "@/drizzle/schema";
import { CreateUserRequest } from "@/types/request";

type User = {
  id: string;
  name: string | null;
};

export type UserRepository = {
  createUser: (params: CreateUserRequest) => Promise<User>;
  getUserById: (userId: string) => Promise<User | undefined>;
};

export function newUserRepository(): UserRepository {
  return {
    createUser,
    getUserById,
  };
}

async function createUser(params: CreateUserRequest) {
  const result = await drizzle
    .insert(users)
    .values({
      loginId: params.loginId,
      name: params.name,
      password: params.password,
    })
    .returning();

  return result[0];
}

async function getUserById(userId: string) {
  const result = await drizzle
    .select()
    .from(users)
    .where(and(eq(users.id, userId)))
    .execute();

  return result.length > 0 ? result[0] : undefined;
}
