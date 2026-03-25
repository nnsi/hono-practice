import { Hono } from "hono";

import { createAIActivityLogRoute } from "@backend/feature/aiActivityLog/aiActivityLogRoute";
import { requireScope } from "@backend/middleware/scopeGuard";

const app = new Hono();

// 音声記録は "all" と "voice" スコープの両方でアクセス可能
app.use("*", requireScope("all", "voice"));

const aiActivityLogRoute = createAIActivityLogRoute();
app.route("/", aiActivityLogRoute);

export const aiActivityLogsV1Route = app;
