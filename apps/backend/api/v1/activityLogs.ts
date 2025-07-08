import { Hono } from "hono";

import { createActivityLogRoute } from "@backend/feature/activityLog/activityLogRoute";

const app = new Hono();

// 既存のActivityLogルートを再利用
const activityLogRoute = createActivityLogRoute();
app.route("/", activityLogRoute);

export const activityLogsV1Route = app;
