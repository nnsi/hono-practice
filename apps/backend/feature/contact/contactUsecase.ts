import type { Tracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import type { ContactRequest } from "@packages/types/request";

import type { ContactRepository } from "./contactRepository";

type ContactItem = {
  id: string;
  email: string;
  category: string | null;
  body: string;
  ipAddress: string;
  userId: string | null;
  createdAt: Date;
};

export type ContactUsecase = {
  createContact: (
    params: ContactRequest,
    ipAddress: string,
    userId?: UserId,
  ) => Promise<void>;
  listContacts: (
    limit: number,
    offset: number,
  ) => Promise<{ items: ContactItem[]; total: number }>;
  getContactById: (id: string) => Promise<ContactItem | undefined>;
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
    listContacts: async (limit: number, offset: number) => {
      return tracer.span("db.listContacts", () =>
        repo.listContacts(limit, offset),
      );
    },
    getContactById: async (id: string) => {
      return tracer.span("db.getContactById", () => repo.getContactById(id));
    },
  };
}
