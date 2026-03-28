import type { UserRepository } from "@backend/feature/user/userRepository";
import type { Tracer } from "@backend/lib/tracer";

export type AdminUserUsecase = {
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
};

export function newAdminUserUsecase(
  repo: UserRepository,
  tracer: Tracer,
): AdminUserUsecase {
  return {
    listUsers: async (limit, offset) => {
      return tracer.span("db.listUsers", () => repo.listUsers(limit, offset));
    },
  };
}
