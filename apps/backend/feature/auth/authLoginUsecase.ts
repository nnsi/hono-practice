import { AuthError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import {
  type RefreshToken as RefreshTokenEntity,
  createRefreshToken,
  validateRefreshToken,
} from "@packages/domain/auth/refreshTokenSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { UserRepository } from "../user";
import { generateAccessToken, generateRefreshToken } from "./authTokenUtils";
import type { AuthOutput, LoginInput } from "./authUsecaseTypes";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";

export function login(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
) {
  return async (input: LoginInput): Promise<AuthOutput> => {
    const { loginId, password } = input;
    const user = await tracer.span("db.getUserByLoginId", () =>
      userRepo.getUserByLoginId(loginId),
    );
    if (!user) throw new AuthError("invalid credentials");
    if (!user.password)
      throw new AuthError(
        "invalid credentials - password cannot be null for standard login",
      );

    const isValidPassword = await passwordVerifier.compare(
      password,
      user.password,
    );
    if (!isValidPassword) throw new AuthError("invalid credentials");

    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      user.id,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();

    const refreshTokenEntity = createRefreshToken({
      userId: user.id,
      selector,
      token: await hashWithSHA256(plainRefreshToken),
      expiresAt,
    });
    await tracer.span("db.createRefreshToken", () =>
      refreshTokenRepo.createRefreshToken(refreshTokenEntity),
    );
    const combinedRefreshToken = `${selector}.${plainRefreshToken}`;

    return { accessToken, refreshToken: combinedRefreshToken };
  };
}

/** DB読み取り: トークン取得 + バリデーション */
export function fetchRefreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  tracer: Tracer,
) {
  return async (combinedToken: string): Promise<RefreshTokenEntity> => {
    const storedToken = await tracer.span("db.getRefreshTokenByToken", () =>
      refreshTokenRepo.getRefreshTokenByToken(combinedToken),
    );
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (!validateRefreshToken(storedToken)) {
      await tracer.span("db.revokeRefreshToken", () =>
        refreshTokenRepo.revokeRefreshToken(storedToken),
      );
      throw new AuthError("invalid refresh token (validation failed)");
    }
    return storedToken;
  };
}

/** DB書き込み: JWT生成 + 新トークン作成 + 旧トークン失効 */
export function rotateRefreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
) {
  return async (
    storedToken: RefreshTokenEntity,
    fireAndForgetFn?: (p: Promise<unknown>) => void,
  ): Promise<AuthOutput> => {
    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      storedToken.userId,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();

    const refreshTokenEntity = createRefreshToken({
      userId: storedToken.userId,
      selector,
      token: await hashWithSHA256(plainRefreshToken),
      expiresAt,
    });
    const newCombinedRefreshToken = `${selector}.${plainRefreshToken}`;

    const dbWrites = Promise.all([
      tracer.span("db.createRefreshToken", () =>
        refreshTokenRepo.createRefreshToken(refreshTokenEntity),
      ),
      tracer.span("db.revokeRefreshToken", () =>
        refreshTokenRepo.revokeRefreshToken(storedToken),
      ),
    ]);

    if (fireAndForgetFn) {
      fireAndForgetFn(dbWrites);
    } else {
      await dbWrites;
    }

    return { accessToken, refreshToken: newCombinedRefreshToken };
  };
}

/** fetch + rotate の一括実行（後方互換） */
export function refreshTokenFull(
  refreshTokenRepo: RefreshTokenRepository,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
) {
  const fetch = fetchRefreshToken(refreshTokenRepo, tracer);
  const rotate = rotateRefreshToken(
    refreshTokenRepo,
    jwtSecret,
    jwtAudience,
    tracer,
  );
  return async (combinedToken: string): Promise<AuthOutput> => {
    const storedToken = await fetch(combinedToken);
    return rotate(storedToken);
  };
}

export function logout(
  refreshTokenRepo: RefreshTokenRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, refreshToken: string): Promise<void> => {
    const storedToken = await tracer.span("db.getRefreshTokenByToken", () =>
      refreshTokenRepo.getRefreshTokenByToken(refreshToken),
    );
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (storedToken.userId !== userId)
      throw new AuthError("unauthorized - token does not belong to user");

    await tracer.span("db.revokeRefreshToken", () =>
      refreshTokenRepo.revokeRefreshToken(storedToken),
    );
  };
}
