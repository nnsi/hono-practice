import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { customTypeNumeric, iconTypeEnum, users } from "./userSchema";

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
  ],
);

// Activity テーブル
export const activities = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    label: text("label").default(""),
    emoji: text("emoji").default(""),
    iconType: iconTypeEnum("icon_type").default("emoji").notNull(),
    iconUrl: text("icon_url"),
    iconThumbnailUrl: text("icon_thumbnail_url"),
    description: text("description").default(""),
    quantityUnit: text("quantity_unit").default(""),
    orderIndex: text("order_index").default(""),
    showCombinedStats: boolean("show_combined_stats").notNull().default(true),
    recordingMode: text("recording_mode").default("manual").notNull(),
    recordingModeConfig: text("recording_mode_config"),
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
    index("activity_user_id_idx").on(t.userId),
    index("activity_created_at_idx").on(t.createdAt),
  ],
);

export const activitiesRelations = relations(activities, ({ many }) => ({
  kinds: many(activityKinds),
  activityLogs: many(activityLogs),
}));

// ActivityKind テーブル
export const activityKinds = pgTable(
  "activity_kind",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
    name: text("name").notNull(),
    color: text("color"), // 色設定（hex形式: #RRGGBB）
    orderIndex: text("order_index").default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("activity_kind_activity_id_idx").on(t.activityId)],
);

export const activityKindsRelations = relations(activityKinds, ({ one }) => ({
  activity: one(activities, {
    fields: [activityKinds.activityId],
    references: [activities.id],
  }),
}));

// ActivityLog テーブル
export const activityLogs = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
    activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
    quantity: customTypeNumeric("quantity"),
    memo: text("memo").default(""),
    date: date("date").notNull(),
    time: time("done_hour"),
    taskId: uuid("task_id").references(() => tasks.id),
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
    index("activity_log_activity_id_idx").on(t.activityId),
    index("activity_log_activity_kind_id_idx").on(t.activityKindId),
    index("activity_log_date_idx").on(t.date),
    index("activity_log_user_id_date_idx").on(t.userId, t.date),
    index("activity_log_task_id_idx").on(t.taskId),
  ],
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  activity: one(activities, {
    fields: [activityLogs.activityId],
    references: [activities.id],
  }),
  activityKind: one(activityKinds, {
    fields: [activityLogs.activityKindId],
    references: [activityKinds.id],
  }),
}));
