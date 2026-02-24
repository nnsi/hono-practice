import { createUserId } from "@backend/domain";
import { noopTracer } from "@backend/lib/tracer";
import { instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { UserProviderRepository } from "../../auth/userProviderRepository";
import { type UserRepository, newUserUsecase } from "..";

describe("UserUsecase", () => {
  let repo: UserRepository;
  let providerRepo: UserProviderRepository;
  let usecase: ReturnType<typeof newUserUsecase>;

  const userId = createUserId("00000000-0000-4000-8000-000000000000");

  beforeEach(() => {
    repo = mock<UserRepository>();
    providerRepo = mock<UserProviderRepository>();
    usecase = newUserUsecase(
      instance(repo),
      instance(providerRepo),
      noopTracer,
    );
    reset(repo);
    reset(providerRepo);
  });

  describe("deleteUser", () => {
    it("正常系：ユーザー削除が成功する", async () => {
      when(repo.deleteUser(userId)).thenResolve();

      await usecase.deleteUser(userId);

      verify(repo.deleteUser(userId)).once();
    });

    it("異常系：リポジトリがエラーをスローする", async () => {
      when(repo.deleteUser(userId)).thenReject(new Error("db error"));

      await expect(usecase.deleteUser(userId)).rejects.toThrow("db error");
    });
  });
});
