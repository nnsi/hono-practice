import { Hono } from "hono";

import { createAIActivityLogRoute } from "@backend/feature/aiActivityLog/aiActivityLogRoute";

const app = new Hono();

// scope middleware は api/v1/index.ts の V1_SCOPE_MAPPING で一元管理される
const aiActivityLogRoute = createAIActivityLogRoute();
app.route("/", aiActivityLogRoute);

export const aiActivityLogsV1Route = app;
