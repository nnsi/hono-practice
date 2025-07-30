import type { Context } from "hono";

import type { Config } from "../config";
import type { UserId } from "../domain";
import type { Subscription } from "../domain/subscription";
import type { QueryExecutor } from "../infra/rdb/drizzle";
import type { R2Bucket } from "@cloudflare/workers-types";

export type JwtPayload = {
  id: string;
  exp: number;
};

export type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
    userId: UserId;
    user?: { id: string };
    subscription?: Subscription;
  };
  Bindings: Config & {
    DB: QueryExecutor;
    R2_BUCKET?: R2Bucket;
  };
};

export type HonoContext = Context<AppContext>;
