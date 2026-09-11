import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { activities, activityKinds } from "./activitySchema";
import { customTypeNumeric, users } from "./userSchema";

export const taskSchedules = pgTable(
  "task_schedule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    activityId: uuid("activity_id").references(() => activities.id),
    activityKindId: uuid("activity_kind_id").references(() => activityKinds.id),
    quantity: customTypeNumeric("quantity"),
    title: text("title").notNull(),
    memo: text("memo").default(""),
    recurrenceType: text("recurrence_type")
      .$type<"interval" | "weekdays">()
      .notNull(),
    intervalDays: integer("interval_days"),
    weekdays: jsonb("weekdays").$type<number[]>(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(true),
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
    index("task_schedule_user_id_updated_at_idx").on(t.userId, t.updatedAt),
  ],
);
