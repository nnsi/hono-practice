// import dotenv from "dotenv";
import { z } from "zod";

// dotenv.config();

export const configSchema = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["local", "stg", "production", "test"]),
  DATABASE_URL: z.string(),
  API_PORT: z.coerce.number().optional(),
});

export type Config = z.infer<typeof configSchema>;
