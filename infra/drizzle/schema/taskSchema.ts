import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { activities, activityKinds } from "./activitySchema";
import { customTypeNumeric, users } from "./userSchema";

// Task テーブル
export const tasks = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activityId: uuid("activity_id").references(() => activities.id),
    activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
    quantity: customTypeNumeric("quantity"),
    title: text("title").notNull(),
    doneDate: date("done_date"),
    memo: text("memo").default(""),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
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
    index("task_user_id_idx").on(t.userId),
    index("task_created_at_idx").on(t.createdAt),
    // sync pull: WHERE user_id = ? AND updated_at > ?
    index("task_user_id_updated_at_idx").on(t.userId, t.updatedAt),
  ],
);
