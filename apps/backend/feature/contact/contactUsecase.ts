import type { Tracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import type { ContactRequest } from "@packages/types/request";

import type { ContactRepository } from "./contactRepository";

export type ContactUsecase = {
  createContact: (
    params: ContactRequest,
    ipAddress: string,
    userId?: UserId,
  ) => Promise<void>;
};

export function newContactUsecase(
  repo: ContactRepository,
  tracer: Tracer,
): ContactUsecase {
  return {
    createContact: async (
      params: ContactRequest,
      ipAddress: string,
      userId?: UserId,
    ) => {
      await tracer.span("db.createContact", () =>
        repo.createContact({
          email: params.email,
          category: params.category ?? null,
          body: params.body,
          ipAddress,
          userId: userId ?? null,
        }),
      );
    },
  };
}
