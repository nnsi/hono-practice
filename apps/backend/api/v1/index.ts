import { Hono } from "hono";

import { apiKeyAuthMiddleware } from "@backend/middleware/apiKeyAuth";
import { requireResourceScope } from "@backend/middleware/scopeGuard";

import { activityLogsV1Route } from "./activityLogs";
import { aiActivityLogsV1Route } from "./aiActivityLogs";
import { tasksV1Route } from "./tasks";

const app = new Hono();

// API v1ルートはAPIキー認証のみ
app.use("*", apiKeyAuthMiddleware);

// リソースベーススコープ: GET→:read, POST/PUT/DELETE→:write
app.use("/activity-logs/*", requireResourceScope("activity-logs"));
app.use("/tasks/*", requireResourceScope("tasks"));
app.route("/activity-logs", activityLogsV1Route);
app.route("/tasks", tasksV1Route);

// AI音声記録は "voice" スコープ（"all" は scopeGuard 内で自動許可）
app.route("/ai/activity-logs", aiActivityLogsV1Route);

export const apiV1Route = app;
