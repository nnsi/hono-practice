import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { OAuthVerify } from "./oauthVerify";

export type OAuthConsents = {
  age: true;
  terms: string;
  privacy: string;
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type AuthOutput = {
  accessToken: string;
  refreshToken: string;
  userId?: string;
};

export type AuthUsecase = {
  login(input: LoginInput): Promise<AuthOutput>;
  refreshToken(token: string): Promise<AuthOutput>;
  /** UPDATE RETURNING でアトミックにrevoke+取得+新トークン発行（TOCTOU防止） */
  atomicRotateRefreshToken(combinedToken: string): Promise<AuthOutput>;
  logout(userId: UserId, refreshToken: string): Promise<void>;
  loginWithProvider(
    provider: Provider,
    credential: string,
    clientId: string | string[],
    consents?: OAuthConsents,
  ): Promise<AuthOutput>;
  linkProvider(
    userId: UserId,
    provider: Provider,
    credential: string,
    clientId: string | string[],
  ): Promise<void>;
};

export type OAuthVerifierMap = Record<Provider, OAuthVerify>;
