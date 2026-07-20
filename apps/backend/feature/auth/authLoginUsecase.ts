import { AuthError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { UserRepository } from "../user";
import { generateAccessToken, generateRefreshToken } from "./authTokenUtils";
import type { AuthOutput, LoginInput } from "./authUsecaseTypes";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";

/**
 * ユーザー列挙のタイミングサイドチャネル対策用のダミー bcrypt ハッシュ。
 * 実際のパスワードハッシュと同じコストファクタ（bcrypt cost 10）で事前計算した固定文字列。
 * loginId が存在しない場合でもこのハッシュに対して compare を実行し、
 * 存在する場合のパスワード照合と応答時間を揃える。比較結果は分岐に一切使わない。
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$0Rs/e2.UcLN7MSjEIGl1W.mlJY7nyCw.W3VDh20vX/NRG72iAKhAO";

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
    // タイミングサイドチャネル対策: loginId の存在有無にかかわらず必ず bcrypt compare を
    // 実行し、応答時間からユーザーの存在を列挙できないようにする。ユーザー不在
    // （またはパスワード未設定）時はダミーハッシュに対して照合する。
    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
    const isValidPassword = await passwordVerifier.compare(
      password,
      passwordHash,
    );

    // エラーメッセージは全経路で同一文字列に統一する。パスワード未設定（OAuth専用）
    // アカウントだけ固有メッセージを返すと、レスポンス文言からアカウントの存在・種別を
    // 列挙できてしまう（タイミング対策と同じ目的の文言側の対策）。
    if (!user) throw new AuthError("invalid credentials");
    if (!user.password) throw new AuthError("invalid credentials");
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

    return {
      accessToken,
      refreshToken: combinedRefreshToken,
      userId: user.id,
      user,
    };
  };
}

export function rotateRefreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  userRepo: UserRepository,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
) {
  return async (combinedToken: string): Promise<AuthOutput> => {
    const storedToken = await tracer.span("db.revokeAndGetRefreshToken", () =>
      refreshTokenRepo.revokeAndGetRefreshToken(combinedToken),
    );
    if (!storedToken) throw new AuthError("invalid refresh token");
    const user = await tracer.span("db.getUserById", () =>
      userRepo.getUserById(storedToken.userId),
    );
    if (!user) throw new AuthError("invalid refresh token");

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
      userId: storedToken.userId,
      user,
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
