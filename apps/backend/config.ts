import { z } from "zod";

export const configSchema = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "stg", "production", "test"]),
  DATABASE_URL: z.string(),
  API_PORT: z.coerce.number().optional(),
});

export type Config = z.infer<typeof configSchema>;
