import type { AppContext } from "@backend/context";
import { UnauthorizedError } from "@backend/error";

/**
 * 管理者JWT署名鍵を取得する。
 * 未設定なら UnauthorizedError をスロー（メッセージは内部状態を漏らさない）。
 * config.ts の superRefine で prod/stg は起動時に必須化済みのため、
 * dev で env 未設定の場合のみここに到達する想定。
 */
export function getAdminJwtSecret(env: AppContext["Bindings"]): string {
  if (!env.JWT_SECRET_ADMIN) {
    throw new UnauthorizedError("unauthorized");
  }
  return env.JWT_SECRET_ADMIN;
}
