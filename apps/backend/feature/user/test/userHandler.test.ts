import type { User } from "@packages/domain/user/userSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, verify, when } from "ts-mockito";
import { describe, it } from "vitest";

import type { AuthHandler } from "../../auth/authHandler";
import type { UserUsecase, UserWithProviders } from "..";
import { newUserHandler } from "../userHandler";

function makeEnrichedUser(userId: UserId): UserWithProviders {
  return {
    type: "persisted",
    id: userId,
    name: "test",
    loginId: "test",
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    providers: [],
    providerEmails: undefined,
    plan: "free",
    tabPreference: {
      tabs: ["home", "daily", "stats", "goals", "tasks"],
      updatedAt: new Date().toISOString(),
    },
  };
}

describe("userHandler.getMe (cachedUser 最適化経路)", () => {
  const userId = createUserId("00000000-0000-4000-8000-000000000000");

  it("cachedUser が渡された場合は enrichUser を呼び、getUserById は呼ばない", async () => {
    const uc = mock<UserUsecase>();
    const authH = mock<AuthHandler>();
    const enriched = makeEnrichedUser(userId);
    when(uc.enrichUser(anything())).thenResolve(enriched);

    const cachedUser: User = {
      type: "persisted",
      id: userId,
      name: "test",
      loginId: "test",
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const handler = newUserHandler(instance(uc), instance(authH));

    await handler.getMe(userId, cachedUser);

    verify(uc.enrichUser(cachedUser)).once();
    verify(uc.getUserById(userId)).never();
  });

  it("cachedUser が undefined の場合は getUserById にフォールバックする", async () => {
    const uc = mock<UserUsecase>();
    const authH = mock<AuthHandler>();
    const enriched = makeEnrichedUser(userId);
    when(uc.getUserById(userId)).thenResolve(enriched);

    const handler = newUserHandler(instance(uc), instance(authH));

    await handler.getMe(userId, undefined);

    verify(uc.getUserById(userId)).once();
    verify(uc.enrichUser(anything())).never();
  });
});
