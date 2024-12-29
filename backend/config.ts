import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envVariables = z.object({
  APP_URL: z.string(),
  JWT_SECRET: z.string().min(32),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

export const config = envVariables.parse(process.env);
