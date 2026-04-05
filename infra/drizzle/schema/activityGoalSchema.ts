import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { activities } from "./activitySchema";
import { customTypeNumeric, users } from "./userSchema";

// ActivityGoal テーブル（統一された目標管理システム）
export const activityGoals = pgTable(
  "activity_goal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
    dailyTargetQuantity: customTypeNumeric("daily_target_quantity").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),
    debtCap: customTypeNumeric("debt_cap"),
    dayTargets: jsonb("day_targets"),
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
    index("activity_goal_user_id_idx").on(t.userId),
    index("activity_goal_activity_id_idx").on(t.activityId),
  ],
);

export const activityGoalsRelations = relations(activityGoals, ({ one }) => ({
  user: one(users, {
    fields: [activityGoals.userId],
    references: [users.id],
  }),
  activity: one(activities, {
    fields: [activityGoals.activityId],
    references: [activities.id],
  }),
}));

// ActivityGoalFreezePeriod テーブル
export const activityGoalFreezePeriods = pgTable(
  "activity_goal_freeze_period",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => activityGoals.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
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
    index("activity_goal_freeze_period_goal_id_idx").on(t.goalId),
    index("activity_goal_freeze_period_user_id_idx").on(t.userId),
  ],
);
