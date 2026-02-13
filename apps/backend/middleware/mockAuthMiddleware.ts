import type { Next } from "hono";

import type { HonoContext } from "../context";
import { createUserId } from "../domain";
import { noopLogger } from "../lib/logger";
import { noopTracer } from "../lib/tracer";
import { TEST_USER_ID } from "../test.setup";

export function mockAuthMiddleware(c: HonoContext, next: Next) {
  c.set("userId", createUserId(TEST_USER_ID));
  c.set("logger", noopLogger);
  c.set("tracer", noopTracer);
  return next();
}
