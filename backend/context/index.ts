import type { Context } from "hono";

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
};

export type HonoContext = Context<AppContext>;
