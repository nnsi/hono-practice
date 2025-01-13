import type { Next } from "hono";

import { createUserId } from "../domain";
import { TEST_USER_ID } from "../setup.test";

import type { HonoContext } from "../context";

export function mockAuthMiddleware(c: HonoContext, next: Next) {
  c.set("userId", createUserId(TEST_USER_ID));
  return next();
}
