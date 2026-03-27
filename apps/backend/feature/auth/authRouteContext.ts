import type { Context } from "hono";
import { setCookie } from "hono/cookie";

import type { AppContext } from "../../context";
import type { newAuthHandler } from "./authHandler";

export type AuthRouteContext = AppContext & {
  Variables: {
    h: ReturnType<typeof newAuthHandler>;
  };
};

/** リフレッシュトークンをhttpOnly cookieにセット */
export function setRefreshCookie(
  c: Context<AuthRouteContext>,
  refreshToken: string,
) {
  const isDev = c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test";
  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    ...(isDev ? { sameSite: "None" } : { sameSite: "Lax" }),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    path: "/",
  });
}
