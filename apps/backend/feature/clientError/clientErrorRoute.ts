import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { AppContext } from "../../context";

const clientErrorSchema = z.object({
  errorType: z.enum(["component_error", "unhandled_error", "network_error"]),
  message: z.string().min(1).max(1000),
  stack: z.string().max(5000).optional(),
  userId: z.string().optional(),
  screen: z.string().optional(),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().optional(),
});

export const clientErrorRoute = new Hono<AppContext>().post(
  "/",
  zValidator("json", clientErrorSchema),
  async (c) => {
    const body = c.req.valid("json");
    const wae = c.env.WAE_CLIENT_ERRORS;

    if (wae) {
      try {
        c.executionCtx.waitUntil(
          Promise.resolve(
            wae.writeDataPoint({
              blobs: [
                body.errorType,
                body.message,
                body.stack ?? "",
                body.userId ?? "",
                body.screen ?? "",
                body.platform,
                body.appVersion ?? "",
              ],
              doubles: [1],
              indexes: [body.errorType],
            }),
          ),
        );
      } catch {
        // WAE write failure should not affect response
      }
    } else {
      const logger = c.get("logger");
      logger?.info("Client error reported", body);
    }

    return c.body(null, 204);
  },
);
