import type { AppContext } from "@backend/context";
import { googleVerify } from "@backend/feature/auth/googleVerify";
import type { OAuthVerify } from "@backend/feature/auth/oauthVerify";

import {
  type AdminAuthConfig,
  type AdminOriginConfig,
  parseAllowedAdminEmails,
} from "./adminAccessPolicy";
import { type AdminAuthHandler, newAdminAuthHandler } from "./adminAuthHandler";
import { newAdminAuthUsecase } from "./adminAuthUsecase";
import {
  type AdminSessionRepository,
  newAdminSessionRepository,
} from "./adminSessionRepository";

export type AdminAuthDependencies = {
  sessionRepository?: AdminSessionRepository;
  verifyGoogle?: OAuthVerify;
};

function resolveAdminAuthConfig(env: AppContext["Bindings"]): AdminAuthConfig {
  return {
    environment: env.NODE_ENV,
    googleOAuthClientId: env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    allowedEmails: parseAllowedAdminEmails(env.ADMIN_ALLOWED_EMAILS),
  };
}

export function resolveAdminOriginConfig(
  env: AppContext["Bindings"],
): AdminOriginConfig {
  return {
    environment: env.NODE_ENV,
    adminAppUrl: env.ADMIN_APP_URL,
  };
}

export function resolveAdminAuthHandler(
  env: AppContext["Bindings"],
  dependencies: AdminAuthDependencies = {},
): AdminAuthHandler {
  const repository =
    dependencies.sessionRepository ?? newAdminSessionRepository(env.DB);
  return newAdminAuthHandler(
    newAdminAuthUsecase(
      repository,
      dependencies.verifyGoogle ?? googleVerify,
      resolveAdminAuthConfig(env),
    ),
  );
}
