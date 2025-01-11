import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envVariables = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["local", "stg", "production", "test"]),
  DATABASE_URL: z.string(),
  API_PORT: z.coerce.number(),
});

export type SafeEnvs = z.infer<typeof envVariables>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

export const config = envVariables.parse(process.env);
