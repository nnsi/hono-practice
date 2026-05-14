import { Hono } from "hono";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { isMobileClient } from "@backend/utils/clientDetection";
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

const googleCodeExchangeRequestSchema = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
  consents: googleLoginRequestSchema.shape.consents,
});

async function exchangeGoogleCodeForIdToken(
  env: {
    GOOGLE_OAUTH_CLIENT_ID: string;
    GOOGLE_OAUTH_CLIENT_SECRET?: string;
  },
  params: {
    code: string;
    code_verifier: string;
    redirect_uri: string;
  },
): Promise<string | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      redirect_uri: params.redirect_uri,
      grant_type: "authorization_code",
      code_verifier: params.code_verifier,
    }).toString(),
  });
  const tokenData = (await tokenRes.json()) as { id_token?: string };
  return tokenData.id_token ?? null;
}

export function createGoogleAuthRoutes() {
  return new Hono<AuthRouteContext>()
    .post("/", zValidator("json", googleLoginRequestSchema), async (c) => {
      const body = c.req.valid("json");
      const clientIds = collectGoogleClientIds(c.env);
      const { user, token, refreshToken } = await c.var.h.googleLogin(
        body,
        clientIds,
      );
      setRefreshCookie(c, refreshToken);
      return c.json(
        isMobileClient(c) ? { user, token, refreshToken } : { user, token },
      );
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
      zValidator("json", googleCodeExchangeRequestSchema),
      async (c) => {
        const { code, code_verifier, redirect_uri, consents } =
          c.req.valid("json");

        const idToken = await exchangeGoogleCodeForIdToken(c.env, {
          code,
          code_verifier,
          redirect_uri,
        });
        if (!idToken) {
          return c.json({ error: "Failed to exchange code" }, 400);
        }

        const clientIds = collectGoogleClientIds(c.env);
        const { user, token, refreshToken } = await c.var.h.googleLogin(
          { credential: idToken, consents },
          clientIds,
        );
        setRefreshCookie(c, refreshToken);
        return c.json(
          isMobileClient(c) ? { user, token, refreshToken } : { user, token },
        );
      },
    )
    .post(
      "/exchange/link",
      authMiddleware,
      zValidator(
        "json",
        googleCodeExchangeRequestSchema.omit({ consents: true }),
      ),
      async (c) => {
        const userId = c.get("userId");
        const { code, code_verifier, redirect_uri } = c.req.valid("json");
        const idToken = await exchangeGoogleCodeForIdToken(c.env, {
          code,
          code_verifier,
          redirect_uri,
        });
        if (!idToken) {
          return c.json({ error: "Failed to exchange code" }, 400);
        }

        await c.var.h.linkProvider(
          userId,
          "google",
          { credential: idToken },
          collectGoogleClientIds(c.env),
        );
        return c.json({ message: "アカウントを紐付けました" });
      },
    )
    .get("/callback", (c) => {
      const url = new URL(c.req.url);
      return c.redirect(
        `actiko://oauthredirect?${url.searchParams.toString()}`,
      );
    });
}
