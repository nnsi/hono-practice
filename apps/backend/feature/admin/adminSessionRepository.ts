import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { adminSessions } from "@infra/drizzle/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  expiresAt: Date;
};

export type AdminSessionRepository = {
  createAdminSession: (
    email: string,
    name: string,
    expiresAt: Date,
  ) => Promise<{ token: string; session: AdminSession }>;
  findActiveAdminSessionByToken: (
    token: string,
  ) => Promise<AdminSession | undefined>;
  revokeAdminSessionByToken: (token: string) => Promise<void>;
};

function createOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function newAdminSessionRepository(
  db: QueryExecutor,
): AdminSessionRepository {
  return {
    async createAdminSession(email, name, expiresAt) {
      const token = createOpaqueToken();
      const tokenHash = await hashWithSHA256(token);
      const [row] = await db
        .insert(adminSessions)
        .values({ tokenHash, email, name, expiresAt })
        .returning();
      return {
        token,
        session: {
          id: row.id,
          email: row.email,
          name: row.name,
          expiresAt: row.expiresAt,
        },
      };
    },

    async findActiveAdminSessionByToken(token) {
      const tokenHash = await hashWithSHA256(token);
      const row = await db.query.adminSessions.findFirst({
        where: and(
          eq(adminSessions.tokenHash, tokenHash),
          isNull(adminSessions.revokedAt),
          gt(adminSessions.expiresAt, new Date()),
        ),
      });
      return row
        ? {
            id: row.id,
            email: row.email,
            name: row.name,
            expiresAt: row.expiresAt,
          }
        : undefined;
    },

    async revokeAdminSessionByToken(token) {
      const tokenHash = await hashWithSHA256(token);
      await db
        .update(adminSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(adminSessions.tokenHash, tokenHash));
    },
  };
}
