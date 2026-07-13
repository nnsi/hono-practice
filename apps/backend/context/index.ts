import type { Context } from "hono";

import type {
  AnalyticsEngineDataset,
  R2Bucket,
} from "@cloudflare/workers-types";
import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import type { Subscription } from "@packages/domain/subscription/subscriptionSchema";
import type { User, UserId } from "@packages/domain/user/userSchema";

import type { Config } from "../config";
import type { QueryExecutor } from "../infra/rdb/drizzle";
import type { Logger } from "../lib/logger";
import type { Tracer } from "../lib/tracer";
import type { RateLimitCounterPort } from "../port/rateLimit";

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
    // authMiddleware が JWT 検証時に取得した User を再利用するためのキャッシュ。
    // /user/me などで重複 SELECT を避けるため。
    user?: User;
    subscription?: Subscription;
    apiKeyScopes?: ApiKeyScope[];
    apiKeyId?: string;
    logger: Logger;
    tracer: Tracer;
    adminEmail?: string;
  };
  Bindings: Config & {
    DB: QueryExecutor;
    R2_BUCKET?: R2Bucket;
    // Workers KV (Cloudflare) / Redis (Node) によるソフトレート制限ストア。
    RATE_LIMIT_STORE?: RateLimitCounterPort;
    // Analytics Engine（オプション、ローカル開発時はundefined）
    WAE_LOGS?: AnalyticsEngineDataset;
    WAE_CLIENT_ERRORS?: AnalyticsEngineDataset;
    // バッチリクエスト内部呼び出し時に親ミドルウェアがセットする認証済みユーザーID
    __authenticatedUserId?: string;
  };
};

export type HonoContext = Context<AppContext>;
