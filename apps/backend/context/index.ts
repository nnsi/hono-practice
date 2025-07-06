import type { Context } from "hono";

import type { Config } from "../config";
import type { UserId } from "../domain";
import type { QueryExecutor } from "../infra/rdb/drizzle";

export type JwtPayload = {
  id: string;
  exp: number;
};

export type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
    userId: UserId;
    user?: { id: string };
  };
  Bindings: Config & {
    DB: QueryExecutor;
  };
};

export type HonoContext = Context<AppContext>;
