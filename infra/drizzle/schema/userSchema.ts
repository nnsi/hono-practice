import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Enum定義
export const iconTypeEnum = pgEnum("icon_type", [
  "emoji",
  "upload",
  "generate",
]);

export function customTypeNumeric(columnName: string) {
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
    scopes: text("scopes").array().notNull().default(sql`ARRAY['all']::text[]`),
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
