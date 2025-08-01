import { z } from "zod";

export const configSchema = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "stg", "production", "test"]),
  DATABASE_URL: z.string(),
  API_PORT: z.coerce.number().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default("dummy-string"),
  STORAGE_TYPE: z.enum(["local", "r2"]).default("local"),
  UPLOAD_DIR: z.string().default("public/uploads"),
});

export type Config = z.infer<typeof configSchema>;
