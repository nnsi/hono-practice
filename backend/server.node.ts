import { serve } from "@hono/node-server";

import { config } from "./config";

import { app } from "./";

const port = config.API_PORT;
console.log(`Server is running on port ${port} / ${config.NODE_ENV}`);

serve({
  fetch: (request) => {
    return app.fetch(request, config);
  },
  port,
});
