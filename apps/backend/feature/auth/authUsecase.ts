import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";

import type { UserConsentRepository, UserRepository } from "../user";
import { login, logout, rotateRefreshToken } from "./authLoginUsecase";
import { linkProvider, loginWithProvider } from "./authProviderUsecase";
import type { AuthUsecase, OAuthVerifierMap } from "./authUsecaseTypes";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserProviderRepository } from "./userProviderRepository";

export type {
  AuthOutput,
  AuthUsecase,
  OAuthConsents,
  OAuthVerifierMap,
} from "./authUsecaseTypes";

export function newAuthUsecase(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  userConsentRepo: UserConsentRepository,
  txRunner: TransactionRunner,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
  jwtAudience: string,
  oauthVerifiers: OAuthVerifierMap,
  tracer: Tracer,
): AuthUsecase {
  return {
    login: login(
      userRepo,
      refreshTokenRepo,
      passwordVerifier,
      jwtSecret,
      jwtAudience,
      tracer,
    ),
    rotateRefreshToken: rotateRefreshToken(
      refreshTokenRepo,
      userRepo,
      jwtSecret,
      jwtAudience,
      tracer,
    ),
    logout: logout(refreshTokenRepo, tracer),
    loginWithProvider: loginWithProvider(
      userRepo,
      refreshTokenRepo,
      userProviderRepo,
      userConsentRepo,
      txRunner,
      jwtSecret,
      jwtAudience,
      oauthVerifiers,
      tracer,
    ),
    linkProvider: linkProvider(userProviderRepo, oauthVerifiers, tracer),
  };
}
