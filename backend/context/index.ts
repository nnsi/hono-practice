import { Context } from "hono";

import { UserId } from "../domain";

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
