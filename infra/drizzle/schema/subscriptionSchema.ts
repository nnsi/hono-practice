import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { customTypeNumeric, users } from "./userSchema";

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
      enum: ["free", "premium"],
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

// SubscriptionHistory テーブル
export const subscriptionHistories = pgTable(
  "subscription_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => userSubscriptions.id),
    eventType: text("event_type").notNull(),
    plan: text("plan", { enum: ["free", "premium"] }).notNull(),
    status: text("status", {
      enum: ["trial", "active", "paused", "cancelled", "expired"],
    }).notNull(),
    source: text("source").notNull(),
    webhookId: text("webhook_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscription_history_sub_id_created_idx").on(
      t.subscriptionId,
      t.createdAt,
    ),
    uniqueIndex("subscription_history_webhook_id_uniq")
      .on(t.webhookId)
      .where(sql`${t.webhookId} IS NOT NULL`),
  ],
);

// SubscriptionHistoryArchive テーブル（ユーザー物理削除時に subscription_history をアーカイブ）
export const subscriptionHistoryArchives = pgTable(
  "subscription_history_archive",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    originalHistoryId: uuid("original_history_id").notNull(),
    originalSubscriptionId: uuid("original_subscription_id").notNull(),
    deletedUserId: uuid("deleted_user_id").notNull(),
    deletedLoginId: text("deleted_login_id").notNull(),
    eventType: text("event_type").notNull(),
    plan: text("plan", { enum: ["free", "premium"] }).notNull(),
    status: text("status", {
      enum: ["trial", "active", "paused", "cancelled", "expired"],
    }).notNull(),
    source: text("source").notNull(),
    webhookId: text("webhook_id"),
    originalCreatedAt: timestamp("original_created_at", {
      withTimezone: true,
    }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscription_history_archive_deleted_user_idx").on(t.deletedUserId),
  ],
);
