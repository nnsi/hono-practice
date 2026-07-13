import type { AppContext } from "@backend/context";
import { googleVerify } from "@backend/feature/auth/googleVerify";
import type { OAuthVerify } from "@backend/feature/auth/oauthVerify";

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
      env,
    ),
  );
}
