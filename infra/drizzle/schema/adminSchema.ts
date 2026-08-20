import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const adminSessions = pgTable(
  "admin_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_session_token_hash_uniq").on(t.tokenHash),
    index("admin_session_email_idx").on(t.email),
    index("admin_session_expires_at_idx").on(t.expiresAt),
  ],
);

// AdminUserDeletionLog テーブル（管理画面ユーザー削除の監査ログ）
export const adminUserDeletionLogs = pgTable(
  "admin_user_deletion_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deletedUserId: uuid("deleted_user_id").notNull(),
    deletedLoginId: text("deleted_login_id").notNull(),
    deletedName: text("deleted_name"),
    performedByAdminEmail: text("performed_by_admin_email").notNull(),
    deletionCounts: jsonb("deletion_counts").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("admin_user_deletion_log_deleted_user_idx").on(t.deletedUserId),
    index("admin_user_deletion_log_deleted_at_idx").on(t.deletedAt),
  ],
);
