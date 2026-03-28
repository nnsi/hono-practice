import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { contacts } from "@infra/drizzle/schema";

type CreateContactParams = {
  email: string;
  category: string | null;
  body: string;
  ipAddress: string;
  userId: string | null;
};

export type ContactRepository = {
  createContact: (params: CreateContactParams) => Promise<void>;
};

export function newContactRepository(db: QueryExecutor): ContactRepository {
  return {
    createContact: async (params: CreateContactParams) => {
      await db.insert(contacts).values({
        email: params.email,
        category: params.category,
        body: params.body,
        ipAddress: params.ipAddress,
        userId: params.userId,
      });
    },
  };
}
