import type { Context } from "hono";
import { setCookie } from "hono/cookie";

import type { AppContext } from "../../context";
import type { newAuthHandler } from "./authHandler";
import { REFRESH_TOKEN_EXPIRES_IN_MS } from "./authTokenUtils";

export type AuthRouteContext = AppContext & {
  Variables: {
    h: ReturnType<typeof newAuthHandler>;
  };
};

const REFRESH_COOKIE_NAME = "refresh_token";

function refreshCookieOptions(env: AppContext["Bindings"]) {
  const isDev = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: (isDev ? "None" : "Lax") as "None" | "Lax",
    path: "/",
  };
}

/** リフレッシュトークンを httpOnly cookie にセット（auth/user 共通） */
export function setRefreshCookie<E extends AppContext>(
  c: Context<E>,
  refreshToken: string,
) {
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions(c.env),
    expires: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
  });
}

/** リフレッシュトークン cookie をクリア（auth/user 共通） */
export function clearRefreshCookie<E extends AppContext>(c: Context<E>) {
  setCookie(c, REFRESH_COOKIE_NAME, "", {
    ...refreshCookieOptions(c.env),
    expires: new Date(0),
  });
}
