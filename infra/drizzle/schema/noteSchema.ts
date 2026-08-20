import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { activities } from "./activitySchema";
import { users } from "./userSchema";

// Note テーブル
export const notes = pgTable(
  "note",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activityId: uuid("activity_id").references(() => activities.id),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("note_user_id_idx").on(t.userId),
    index("note_activity_id_idx").on(t.activityId),
    index("note_created_at_idx").on(t.createdAt),
    // sync pull: WHERE user_id = ? AND updated_at > ?
    index("note_user_id_updated_at_idx").on(t.userId, t.updatedAt),
  ],
);
