import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { User, UserId } from "@packages/domain/user/userSchema";

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

// user は既に取得済みのケース（login / rotateRefreshToken）でセットされる。
// loginWithProvider は user 取得をスキップしているため undefined。
export type AuthOutput = {
  accessToken: string;
  refreshToken: string;
  userId: UserId;
  user?: User;
};

export type AuthUsecase = {
  login(input: LoginInput): Promise<AuthOutput>;
  rotateRefreshToken(combinedToken: string): Promise<AuthOutput>;
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
