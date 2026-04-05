import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
