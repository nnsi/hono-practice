import { Hono } from "hono";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";
import { googleLoginRequestSchema } from "@packages/types/request";
import { z } from "zod";

import { type AuthRouteContext, setRefreshCookie } from "./authRouteContext";

function collectGoogleClientIds(env: {
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_ID_ANDROID?: string;
  GOOGLE_OAUTH_CLIENT_ID_IOS?: string;
}): string[] {
  return [
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    env.GOOGLE_OAUTH_CLIENT_ID_IOS,
  ].filter((id): id is string => !!id);
}

export function createGoogleAuthRoutes() {
  return new Hono<AuthRouteContext>()
    .post("/", zValidator("json", googleLoginRequestSchema), async (c) => {
      const body = c.req.valid("json");
      const clientIds = collectGoogleClientIds(c.env);
      const { user, token, refreshToken } = await c.var.h.googleLoginWithUser(
        body,
        clientIds,
      );
      setRefreshCookie(c, refreshToken);
      return c.json({ user, token, refreshToken });
    })
    .post(
      "/link",
      authMiddleware,
      zValidator("json", googleLoginRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const body = c.req.valid("json");
        await c.var.h.linkProvider(
          userId,
          "google",
          body,
          collectGoogleClientIds(c.env),
        );
        return c.json({ message: "アカウントを紐付けました" });
      },
    )
    .post(
      "/exchange",
      zValidator(
        "json",
        z.object({
          code: z.string(),
          code_verifier: z.string(),
          redirect_uri: z.string(),
          consents: googleLoginRequestSchema.shape.consents,
        }),
      ),
      async (c) => {
        const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = c.env;
        const { code, code_verifier, redirect_uri, consents } =
          c.req.valid("json");

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            client_secret: GOOGLE_OAUTH_CLIENT_SECRET ?? "",
            redirect_uri,
            grant_type: "authorization_code",
            code_verifier,
          }).toString(),
        });
        const tokenData = (await tokenRes.json()) as { id_token?: string };
        if (!tokenData.id_token) {
          return c.json({ error: "Failed to exchange code" }, 400);
        }

        const clientIds = collectGoogleClientIds(c.env);
        const { user, token, refreshToken } = await c.var.h.googleLoginWithUser(
          { credential: tokenData.id_token, consents },
          clientIds,
        );
        setRefreshCookie(c, refreshToken);
        return c.json({ user, token, refreshToken });
      },
    )
    .get("/callback", (c) => {
      const url = new URL(c.req.url);
      return c.redirect(
        `actiko://oauthredirect?${url.searchParams.toString()}`,
      );
    });
}
