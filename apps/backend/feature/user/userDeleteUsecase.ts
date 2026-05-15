import type { Tracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ApiKeyRepository } from "../apiKey/apiKeyRepository";
import type { RefreshTokenRepository } from "../auth/refreshTokenRepository";
import type { UserRepository } from "./userRepository";

export type UserDeleteUsecaseDeps = {
  refreshTokenRepo: RefreshTokenRepository;
  apiKeyRepo: ApiKeyRepository;
};

// アカウント削除のオーケストレーション。user soft delete + refresh token 全 revoke +
// API key soft delete を 1 つの usecase 境界に閉じる (元は route 層で個別 repository を
// 直接呼んでいたのを規約遵守 route → handler → usecase → repository に揃えた)
export function newDeleteUserUsecase(
  repo: UserRepository,
  deps: UserDeleteUsecaseDeps,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<void> => {
    await tracer.span("db.deleteUser", () => repo.deleteUser(userId));
    await tracer.span("db.revokeRefreshTokenAllByUserId", () =>
      deps.refreshTokenRepo.revokeRefreshTokenAllByUserId(userId),
    );
    await tracer.span("db.softDeleteApiKeysByUserId", () =>
      deps.apiKeyRepo.softDeleteApiKeysByUserId(userId),
    );
  };
}
