import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { contacts } from "@infra/drizzle/schema";
import { count, desc, eq } from "drizzle-orm";

type CreateContactParams = {
  email: string;
  category: string | null;
  body: string;
  ipAddress: string;
  userId: string | null;
};

type ContactItem = {
  id: string;
  email: string;
  category: string | null;
  body: string;
  ipAddress: string;
  userId: string | null;
  createdAt: Date;
};

export type ContactRepository = {
  createContact: (params: CreateContactParams) => Promise<void>;
  listContacts: (
    limit: number,
    offset: number,
  ) => Promise<{ items: ContactItem[]; total: number }>;
  getContactById: (id: string) => Promise<ContactItem | undefined>;
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
    listContacts: listContacts(db),
    getContactById: getContactById(db),
  };
}

function listContacts(db: QueryExecutor) {
  return async (limit: number, offset: number) => {
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(contacts)
        .orderBy(desc(contacts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(contacts),
    ]);

    return { items, total };
  };
}

function getContactById(db: QueryExecutor) {
  return async (id: string) => {
    const [result] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    return result;
  };
}
