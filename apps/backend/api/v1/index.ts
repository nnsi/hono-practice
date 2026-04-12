import { Hono, type MiddlewareHandler } from "hono";

import { apiKeyAuthMiddleware } from "@backend/middleware/apiKeyAuth";
import {
  requireResourceScope,
  requireScope,
} from "@backend/middleware/scopeGuard";

import { activityLogsV1Route } from "./activityLogs";
import { aiActivityLogsV1Route } from "./aiActivityLogs";
import { V1_SCOPE_MAPPING } from "./scopeMapping";
import { tasksV1Route } from "./tasks";

export function createApiV1Route(
  authMiddleware: MiddlewareHandler = apiKeyAuthMiddleware,
) {
  const app = new Hono();

  // API v1 ルートは API キー認証のみ
  app.use("*", authMiddleware);

  // scope middleware は V1_SCOPE_MAPPING を単一ソースとして登録する
  for (const [prefix, config] of Object.entries(V1_SCOPE_MAPPING)) {
    if (config.kind === "resource") {
      app.use(`${prefix}/*`, requireResourceScope(config.resource));
    } else {
      app.use(`${prefix}/*`, requireScope(config.scope));
    }
  }

  app.route("/activity-logs", activityLogsV1Route);
  app.route("/tasks", tasksV1Route);
  app.route("/ai/activity-logs", aiActivityLogsV1Route);

  return app;
}
