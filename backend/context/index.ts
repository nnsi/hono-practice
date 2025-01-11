import type { Context } from "hono";

import type { SafeEnvs } from "../config";
import type { UserId } from "../domain";

export type JwtPayload = {
  id: string;
  exp: number;
};

export type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
    userId: UserId;
  };
  Bindings: SafeEnvs;
};

export type HonoContext = Context<AppContext>;
