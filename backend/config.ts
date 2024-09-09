import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envVariables = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

export const config = envVariables.parse(process.env);
