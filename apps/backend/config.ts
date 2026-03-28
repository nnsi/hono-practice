import { z } from "zod";

export const configSchema = z.object({
  APP_URL: z.string(),
  APP_URL_V2: z.string().optional(),
  // この API（リソース）向けに発行されたトークンだけを受け付けるための識別子
  // 例: "actiko-backend"
  JWT_AUDIENCE: z.string().min(1).default("actiko-backend"),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "stg", "production", "test"]),
  DATABASE_URL: z.string(),
  API_PORT: z.coerce.number().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default("dummy-string"),
  GOOGLE_OAUTH_CLIENT_ID_ANDROID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID_IOS: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  // Apple Sign In
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(), // Services ID (Web)
  APPLE_BUNDLE_ID: z.string().optional(), // iOS Bundle ID (audience検証用)
  APPLE_PRIVATE_KEY: z.string().optional(), // Base64 encoded .p8 key
  // Admin
  ADMIN_ALLOWED_EMAILS: z.string().optional(),
  STORAGE_TYPE: z.enum(["local", "r2"]).default("local"),
  UPLOAD_DIR: z.string().default("public/uploads"),
  // Redis URL（ローカル開発用、オプション）
  REDIS_URL: z.string().optional(),
  // AI連携（OpenRouter）
  OPENROUTER_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("google/gemini-2.5-flash-lite"),
  // Webhook認証
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_WEBHOOK_AUTH_KEY: z.string().optional(),
  // Polar Checkout
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_PRICE_ID: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;
