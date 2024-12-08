import { Context } from "hono";

export type JwtPayload = {
  id: string;
  exp: number;
};

export type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
  };
};

export type HonoContext = Context<AppContext>;
