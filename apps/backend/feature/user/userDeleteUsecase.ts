import type { TransactionRunner } from "@backend/infra/rdb/db";
import { authUserCache } from "@backend/lib/authUserCache";
import type { Tracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";

import type { UserDeletionRepository } from "./userDeletionRepository";

export type UserDeleteUsecaseDeps = {
  deletionRepo: UserDeletionRepository;
  txRunner: TransactionRunner;
  deleteUserFiles: (userId: UserId) => Promise<void>;
};

export function newDeleteUserUsecase(
  deps: UserDeleteUsecaseDeps,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<void> => {
    await tracer.span("db.deactivateUser", () =>
      deps.txRunner.run([deps.deletionRepo], async (tx) => {
        if (!(await tx.lockUserForDeletion(userId))) return;
        await tx.deactivateUser(userId);
      }),
    );
    authUserCache.invalidate(userId);
  };
}
