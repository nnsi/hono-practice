import type { Next } from "hono";

import { createUserId } from "../domain";
import { TEST_USER_ID } from "../test.setup";

import type { HonoContext } from "../context";

export function mockAuthMiddleware(c: HonoContext, next: Next) {
  c.set("userId", createUserId(TEST_USER_ID));
  return next();
}
