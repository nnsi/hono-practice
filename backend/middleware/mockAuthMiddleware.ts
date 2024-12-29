import { Next } from "hono";

import { HonoContext } from "../context";
import { createUserId } from "../domain";
import { TEST_USER_ID } from "../test.setup";

export function mockAuthMiddleware(c: HonoContext, next: Next) {
  c.set("userId", createUserId(TEST_USER_ID));
  return next();
}
