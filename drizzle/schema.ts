import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  real,
  date,
} from "drizzle-orm/pg-core";

// User テーブル
export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  loginId: text("login_id").unique().notNull(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Task テーブル
export const tasks = pgTable("task", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "restrict" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  memo: text("memo").default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Activity テーブル
export const activities = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "restrict" }),
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
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

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
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ActivityLog テーブル
export const activityLogs = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, {
      onUpdate: "cascade",
      onDelete: "restrict",
    }),
  activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
  quantity: real("quantity"),
  memo: text("memo").default(""),
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ActivityKind テーブル
export const activityKinds = pgTable("activity_kind", {
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
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
