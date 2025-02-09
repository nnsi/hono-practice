import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

function customTypeNumeric(columnName: string) {
  return customType<{
    data: number;
    driverData: number;
  }>({
    dataType() {
      return "numeric";
    },
    toDriver(value) {
      return value;
    },
    fromDriver(value) {
      return Number(value);
    },
  })(columnName);
}

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
  (t) => [index("user_login_id_idx").on(t.loginId)],
);

// Task テーブル
export const tasks = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    memo: text("memo").default(""),
    due: date("due"),
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
    description: text("description").default(""),
    quantityUnit: text("quantity_unit").default(""),
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
  ],
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
      .references(() => users.id),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
    activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
    quantity: customTypeNumeric("quantity"),
    memo: text("memo").default(""),
    date: date("date").notNull(),
    time: time("done_hour"),
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

// ActivityKind テーブル
export const activityKinds = pgTable(
  "activity_kind",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
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
  (t) => [index("activity_kind_activity_id_idx").on(t.activityId)],
);

export const activityKindsRelations = relations(activityKinds, ({ one }) => ({
  activity: one(activities, {
    fields: [activityKinds.activityId],
    references: [activities.id],
  }),
}));

const parentGoalIdReferenceToSelf = () => goals.id;

// Goal テーブル
export const goals = pgTable(
  "goal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    parentGoalId: uuid("parent_goal_id").references(
      parentGoalIdReferenceToSelf,
    ),
    title: text("title").notNull(),
    unit: text("unit"),
    quantity: customTypeNumeric("quantity"),
    currentQuantity: customTypeNumeric("current_quantity"),
    emoji: text("emoji"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
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
    index("goal_user_id_idx").on(t.userId),
    index("goal_parent_goal_id_idx").on(t.parentGoalId),
    index("goal_created_at_idx").on(t.createdAt),
  ],
);

export const goals_tasks = pgTable(
  "goals_tasks",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
  },
  (t) => [
    primaryKey({ columns: [t.goalId, t.taskId] }),
    index("goals_tasks_goal_id_idx").on(t.goalId),
    index("goals_tasks_task_id_idx").on(t.taskId),
  ],
);

export const goals_activities = pgTable(
  "goals_activities",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
  },
  (t) => [
    primaryKey({ columns: [t.goalId, t.activityId] }),
    index("goals_activities_goal_id_idx").on(t.goalId),
    index("goals_activities_activity_id_idx").on(t.activityId),
  ],
);
