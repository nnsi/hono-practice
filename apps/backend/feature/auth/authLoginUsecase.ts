import { AuthError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import {
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

export function atomicRotateRefreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
) {
  return async (combinedToken: string): Promise<AuthOutput> => {
    const storedToken = await tracer.span("db.revokeAndGetRefreshToken", () =>
      refreshTokenRepo.revokeAndGetRefreshToken(combinedToken),
    );
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (!validateRefreshToken(storedToken)) {
      throw new AuthError("invalid refresh token (validation failed)");
    }

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

    await tracer.span("db.createRefreshToken", () =>
      refreshTokenRepo.createRefreshToken(refreshTokenEntity),
    );

    return {
      accessToken,
      refreshToken: `${selector}.${plainRefreshToken}`,
    };
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
