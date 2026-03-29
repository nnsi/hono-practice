import { Hono } from "hono";

import { createAIActivityLogRoute } from "@backend/feature/aiActivityLog/aiActivityLogRoute";
import { requireScope } from "@backend/middleware/scopeGuard";

const app = new Hono();

// 音声記録は "voice" スコープ（"all" は scopeGuard 内で自動許可）
app.use("*", requireScope("voice"));

const aiActivityLogRoute = createAIActivityLogRoute();
app.route("/", aiActivityLogRoute);

export const aiActivityLogsV1Route = app;
