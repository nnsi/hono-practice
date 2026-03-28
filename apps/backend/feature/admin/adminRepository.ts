import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityLogs, contacts, users } from "@infra/drizzle/schema";
import { count, desc, eq, gte } from "drizzle-orm";

type UserListItem = {
  id: string;
  loginId: string;
  name: string | null;
  createdAt: Date;
};

type ContactListItem = {
  id: string;
  email: string;
  category: string | null;
  body: string;
  ipAddress: string;
  userId: string | null;
  createdAt: Date;
};

type DashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
};

export type AdminRepository = {
  listUsers: (
    limit: number,
    offset: number,
  ) => Promise<{ items: UserListItem[]; total: number }>;
  listContacts: (
    limit: number,
    offset: number,
  ) => Promise<{ items: ContactListItem[]; total: number }>;
  getContactById: (id: string) => Promise<ContactListItem | undefined>;
  getDashboardData: () => Promise<DashboardData>;
};

export function newAdminRepository(db: QueryExecutor): AdminRepository {
  return {
    listUsers: async (limit: number, offset: number) => {
      const [items, totalResult] = await Promise.all([
        db
          .select({
            id: users.id,
            loginId: users.loginId,
            name: users.name,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(users),
      ]);
      return { items, total: totalResult[0]?.count ?? 0 };
    },

    listContacts: async (limit: number, offset: number) => {
      const [items, totalResult] = await Promise.all([
        db
          .select()
          .from(contacts)
          .orderBy(desc(contacts.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(contacts),
      ]);
      return { items, total: totalResult[0]?.count ?? 0 };
    },

    getContactById: async (id: string) => {
      const rows = await db.select().from(contacts).where(eq(contacts.id, id));
      return rows[0];
    },

    getDashboardData: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [userCount, contactCount, actionCount] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(contacts),
        db
          .select({ count: count() })
          .from(activityLogs)
          .where(
            gte(activityLogs.date, sevenDaysAgo.toISOString().split("T")[0]),
          ),
      ]);
      return {
        totalUsers: userCount[0]?.count ?? 0,
        totalContacts: contactCount[0]?.count ?? 0,
        recentActionCount: actionCount[0]?.count ?? 0,
      };
    },
  };
}
