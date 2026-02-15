import type { Context } from "hono";

import type {
  AnalyticsEngineDataset,
  R2Bucket,
} from "@cloudflare/workers-types";

import type { Config } from "../config";
import type { UserId } from "../domain";
import type { Subscription } from "../domain/subscription";
import type { KeyValueStore } from "../infra/kv/kv";
import type { QueryExecutor } from "../infra/rdb/drizzle";
import type { Logger } from "../lib/logger";
import type { Tracer } from "../lib/tracer";

export type JwtPayload = {
  userId: string;
  aud: string;
  iat?: number;
  exp: number;
};

export type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
    userId: UserId;
    user?: { id: string };
    subscription?: Subscription;
    logger: Logger;
    tracer: Tracer;
  };
  Bindings: Config & {
    DB: QueryExecutor;
    R2_BUCKET?: R2Bucket;
    // レートリミット用KVStore（オプション、未設定時はレートリミット無効）
    RATE_LIMIT_KV?: KeyValueStore<{ count: number; windowStart: number }>;
    // Analytics Engine（オプション、ローカル開発時はundefined）
    WAE_LOGS?: AnalyticsEngineDataset;
  };
};

export type HonoContext = Context<AppContext>;
