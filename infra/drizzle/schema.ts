import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Enum定義
export const iconTypeEnum = pgEnum("icon_type", [
  "emoji",
  "upload",
  "generate",
]);

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
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("user_login_id_idx").on(t.loginId)],
);

// UserProvider テーブル
export const userProviders = pgTable("user_provider", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  email: text("email"),
  providerRefreshToken: text("provider_refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// RefreshToken テーブル
export const refreshTokens = pgTable(
  "refresh_token",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    selector: text("selector").notNull().unique(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
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
    index("refresh_token_user_id_idx").on(t.userId),
    index("refresh_token_selector_idx").on(t.selector),
  ],
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

// sync_metadata テーブル
export const syncMetadata = pgTable(
  "sync_metadata",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    status: text("status", {
      enum: ["pending", "syncing", "synced", "failed"],
    })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    retryCount: customTypeNumeric("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sync_metadata_user_id_idx").on(table.userId),
    entityIdx: index("sync_metadata_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    statusIdx: index("sync_metadata_status_idx").on(table.status),
  }),
);

// sync_queue テーブル
export const syncQueue = pgTable(
  "sync_queue",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation", {
      enum: ["create", "update", "delete"],
    }).notNull(),
    payload: text("payload").notNull(), // JSON文字列として保存
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    sequenceNumber: customTypeNumeric("sequence_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sync_queue_user_id_idx").on(table.userId),
    sequenceIdx: index("sync_queue_sequence_idx").on(
      table.userId,
      table.sequenceNumber,
    ),
    timestampIdx: index("sync_queue_timestamp_idx").on(table.timestamp),
    entityIdx: index("sync_queue_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
  }),
);

// ApiKey テーブル
export const apiKeys = pgTable(
  "api_key",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
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
    index("api_key_user_id_idx").on(t.userId),
    index("api_key_key_idx").on(t.key),
  ],
);

// UserSubscription テーブル
export const userSubscriptions = pgTable(
  "user_subscription",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    plan: text("plan", {
      enum: ["free", "premium", "enterprise"],
    })
      .notNull()
      .default("free"),
    status: text("status", {
      enum: ["trial", "active", "paused", "cancelled", "expired"],
    })
      .notNull()
      .default("trial"),
    paymentProvider: text("payment_provider"), // stripe, paypal 等
    paymentProviderId: text("payment_provider_id"), // StripeのサブスクリプションID等
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    priceAmount: customTypeNumeric("price_amount"), // 将来の価格変更履歴用
    priceCurrency: text("price_currency").default("JPY"),
    metadata: text("metadata"), // JSON形式での追加情報
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("user_subscription_user_id_idx").on(t.userId),
    index("user_subscription_status_idx").on(t.status),
    index("user_subscription_plan_idx").on(t.plan),
  ],
);
