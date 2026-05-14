import type { Tracer } from "@backend/lib/tracer";

import type { UserRepository } from "./userRepository";

export type UserListResult = {
  items: {
    id: string;
    loginId: string;
    name: string | null;
    createdAt: Date;
  }[];
  total: number;
};

// admin 経路で利用 (route → handler → usecase)。pagination は repository に委譲
export function newListUsersUsecase(repo: UserRepository, tracer: Tracer) {
  return async (limit: number, offset: number): Promise<UserListResult> => {
    return tracer.span("db.listUsers", () => repo.listUsers(limit, offset));
  };
}
