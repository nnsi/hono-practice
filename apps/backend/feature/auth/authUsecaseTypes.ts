import type { RefreshToken as RefreshTokenEntity } from "@packages/domain/auth/refreshTokenSchema";
import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { createRemoteJWKSet, jwtVerify as defaultJwtVerify } from "jose";

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

// jwtVerifyの型定義
export type JwtVerifyFn = (
  jwt: string,
  jwks: ReturnType<typeof createRemoteJWKSet>,
  options: Parameters<typeof defaultJwtVerify>[2],
) => ReturnType<typeof defaultJwtVerify>;

export type AuthUsecase = {
  login(input: LoginInput): Promise<AuthOutput>;
  refreshToken(token: string): Promise<AuthOutput>;
  /** DB読み取りのみ: トークン取得+バリデーション（書き込みなし、ただしバリデーション失敗時はrevoke） */
  fetchRefreshToken(token: string): Promise<RefreshTokenEntity>;
  /** DB書き込み: JWT生成 + 新トークン作成 + 旧トークン失効 */
  rotateRefreshToken(
    storedToken: RefreshTokenEntity,
    fireAndForgetFn?: (p: Promise<unknown>) => void,
  ): Promise<AuthOutput>;
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
