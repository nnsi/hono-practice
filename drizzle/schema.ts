import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  real,
  date,
  index,
} from "drizzle-orm/pg-core";

// User テーブル
export const users = pgTable(
  "user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loginId: text("login_id").unique().notNull(),
    name: text("name"),
    password: text("password").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("user_login_id_idx").on(t.loginId)]
);

// Task テーブル
export const tasks = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onUpdate: "cascade",
        onDelete: "restrict",
      }),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    memo: text("memo").default(""),
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
  ]
);

// Activity テーブル
export const activities = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onUpdate: "cascade",
        onDelete: "restrict",
      }),
    name: text("name").notNull(),
    label: text("label").default(""),
    emoji: text("emoji").default(""),
    description: text("description").default(""),
    quantityLabel: text("quantity_label").default(""),
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
  (t) => [
    index("activity_user_id_idx").on(t.userId),
    index("activity_created_at_idx").on(t.createdAt),
  ]
);

export const activitiesRelations = relations(activities, ({ many }) => ({
  kinds: many(activityKinds),
  activityLogs: many(activityLogs),
}));

// ActivityLog テーブル
export const activityLogs = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onUpdate: "cascade",
        onDelete: "restrict",
      }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, {
        onUpdate: "cascade",
        onDelete: "restrict",
      }),
    activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
    quantity: real("quantity"),
    memo: text("memo").default(""),
    date: date("date", { mode: "date" }).notNull(),
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
  ]
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

// ActivityKind テーブル
export const activityKinds = pgTable(
  "activity_kind",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, {
        onUpdate: "cascade",
        onDelete: "restrict",
      }),
    name: text("name").notNull(),
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
  (t) => [index("activity_kind_activity_id_idx").on(t.activityId)]
);

export const activityKindsRelations = relations(activityKinds, ({ one }) => ({
  activity: one(activities, {
    fields: [activityKinds.activityId],
    references: [activities.id],
  }),
}));

// TODO: delete
// ActivityQuantityOption テーブル
export const activityQuantityOptions = pgTable("activity_quantity_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, {
      onUpdate: "cascade",
      onDelete: "restrict",
    }),
  quantity: real("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
