import { z } from "zod";

const envVariables = z.object({
  APP_URL: z.string(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

if (process.env.NODE_ENV === "production") {
  envVariables.parse(process.env);
}

export const config = {
  APP_URL:
    process.env.NODE_ENV === "production"
      ? process.env.APP_URL
      : "http://localhost:5173",
};
