import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import type { AppContext } from "@backend/context";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_MS = 60 * 60 * 1000;

type CookieOptions = NonNullable<Parameters<typeof setCookie>[3]>;

function cookieOptions(env: AppContext["Bindings"]): CookieOptions {
  const deployed = env.NODE_ENV === "production" || env.NODE_ENV === "stg";
  return {
    httpOnly: true,
    secure: deployed,
    sameSite: deployed ? "None" : "Lax",
    path: "/admin",
  };
}

export function getAdminSessionToken<E extends AppContext>(
  c: Context<E>,
): string | undefined {
  return getCookie(c, ADMIN_SESSION_COOKIE);
}

export function setAdminSessionCookie<E extends AppContext>(
  c: Context<E>,
  token: string,
  expiresAt: Date,
): void {
  setCookie(c, ADMIN_SESSION_COOKIE, token, {
    ...cookieOptions(c.env),
    expires: expiresAt,
  });
}

export function clearAdminSessionCookie<E extends AppContext>(
  c: Context<E>,
): void {
  setCookie(c, ADMIN_SESSION_COOKIE, "", {
    ...cookieOptions(c.env),
    expires: new Date(0),
  });
}
