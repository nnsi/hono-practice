import type { AppContext } from "@backend/context";
import { AppError, UnauthorizedError } from "@backend/error";
import type { OAuthVerify } from "@backend/feature/auth/oauthVerify";
import { isLocalHost, isLocalOrigin } from "@backend/utils/isLocalOrigin";

import {
  isAdminEmailAllowed,
  parseAllowedAdminEmails,
} from "./adminAccessPolicy";
import { ADMIN_SESSION_TTL_MS } from "./adminSessionCookie";
import type { AdminSessionRepository } from "./adminSessionRepository";

type AdminIdentity = { email: string; name: string };
type CreatedAdminSession = AdminIdentity & { token: string; expiresAt: Date };

export type AdminAuthUsecase = {
  googleLogin(credential: string): Promise<CreatedAdminSession>;
  devLogin(origin: string, host: string): Promise<CreatedAdminSession>;
  getSession(token: string | undefined): Promise<AdminIdentity>;
  logout(token: string | undefined): Promise<void>;
};

export function newAdminAuthUsecase(
  repository: AdminSessionRepository,
  verifyGoogle: OAuthVerify,
  env: AppContext["Bindings"],
  now: () => number = Date.now,
): AdminAuthUsecase {
  const createSession = async (
    email: string,
    name: string,
  ): Promise<CreatedAdminSession> => {
    const expiresAt = new Date(now() + ADMIN_SESSION_TTL_MS);
    const { token } = await repository.createAdminSession(
      email,
      name,
      expiresAt,
    );
    return { email, name, token, expiresAt };
  };

  return {
    async googleLogin(credential) {
      const payload = await verifyGoogle(credential, [
        env.GOOGLE_OAUTH_CLIENT_ID,
      ]);
      if (!payload.email || !payload.email_verified) {
        throw new AppError("Email not verified", 403);
      }
      if (parseAllowedAdminEmails(env.ADMIN_ALLOWED_EMAILS).length === 0) {
        throw new AppError("Admin access not configured", 500);
      }
      if (!isAdminEmailAllowed(payload.email, env)) {
        throw new AppError("Access denied", 403);
      }
      return createSession(payload.email, payload.name ?? "");
    },

    devLogin(origin, host) {
      if (env.NODE_ENV !== "development") {
        throw new AppError("Not available", 404);
      }
      if (!isLocalOrigin(origin) && !isLocalHost(host)) {
        throw new AppError("Not available", 403);
      }
      return createSession("dev@localhost", "Dev Admin");
    },

    async getSession(token) {
      if (!token) throw new UnauthorizedError("unauthorized");
      const session = await repository.findActiveAdminSessionByToken(token);
      if (!session) throw new UnauthorizedError("unauthorized");
      if (!isAdminEmailAllowed(session.email, env)) {
        await repository.revokeAdminSessionByToken(token);
        throw new UnauthorizedError("unauthorized");
      }
      return { email: session.email, name: session.name };
    },

    async logout(token) {
      if (token) await repository.revokeAdminSessionByToken(token);
    },
  };
}
