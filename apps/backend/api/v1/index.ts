import { Hono } from "hono";

import { apiKeyAuthMiddleware } from "@backend/middleware/apiKeyAuth";

import { activityLogsV1Route } from "./activityLogs";
import { tasksV1Route } from "./tasks";

const app = new Hono();

// API v1ルートはAPIキー認証のみ
app.use("*", apiKeyAuthMiddleware);

app.route("/activity-logs", activityLogsV1Route);
app.route("/tasks", tasksV1Route);

export const apiV1Route = app;
