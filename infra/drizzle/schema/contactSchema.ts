import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Contact テーブル（問い合わせ）
export const contacts = pgTable(
  "contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    email: text("email").notNull(),
    category: text("category"),
    body: text("body").notNull(),
    ipAddress: text("ip_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contact_created_at_idx").on(t.createdAt)],
);
