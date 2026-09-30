import { serve } from "@hono/node-server";
import { z } from "zod";

import { createRevenueCatLocalLab } from "./revenuecat-local";

const config = z
  .object({
    RC_LAB_PASSWORD: z.string().min(16),
    REVENUECAT_API_KEY: z.string().optional(),
    REVENUECAT_WEBHOOK_AUTH_KEY: z.string().min(32),
    RC_LAB_API_PORT: z.coerce.number().int().min(1024).max(65535).default(3546),
    RC_LAB_WEBHOOK_PORT: z.coerce
      .number()
      .int()
      .min(1024)
      .max(65535)
      .default(3547),
    RC_LAB_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  })
  .parse(process.env);

if (config.RC_LAB_API_PORT === config.RC_LAB_WEBHOOK_PORT) {
  throw new Error("API and webhook ports must differ");
}
const lab = await createRevenueCatLocalLab({
  password: config.RC_LAB_PASSWORD,
  webhookKey: config.REVENUECAT_WEBHOOK_AUTH_KEY,
  revenueCatApiKey: config.REVENUECAT_API_KEY,
});
const servers = [
  serve({
    fetch: lab.fetch,
    hostname: config.RC_LAB_HOST,
    port: config.RC_LAB_API_PORT,
  }),
  serve({
    fetch: lab.webhookFetch,
    hostname: "127.0.0.1",
    port: config.RC_LAB_WEBHOOK_PORT,
  }),
];

async function shutdown(code: number) {
  for (const server of servers) {
    if ("closeAllConnections" in server) server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await lab.close();
  process.exit(code);
}
for (const server of servers) {
  server.on("error", (error) => {
    console.error("RevenueCat local server failed", error.message);
    void shutdown(1);
  });
}
process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));
console.log(`Local API: http://localhost:${config.RC_LAB_API_PORT}`);
console.log(
  `Webhook only: http://localhost:${config.RC_LAB_WEBHOOK_PORT}/webhooks/revenuecat`,
);
console.log(`Login: ${lab.loginId}; app_user_id: ${lab.userId}`);
console.log(
  "Ephemeral local DB. Restart resets all data and changes app_user_id. No production credentials loaded.",
);
