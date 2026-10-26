import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import type { UserDeleteUsecaseDeps } from "../userDeleteUsecase";
import { cleanupExpiredUsers } from "../userDeletionCleanup";

function setup() {
  const ids = [createUserId(), createUserId()];
  const deletionRepo = {
    withTx: vi.fn(),
    listExpiredUsers: vi.fn(async () => ids),
    lockUserForDeletion: vi.fn(async () => true),
    isUserDeletionDue: vi.fn(async () => true),
    deactivateUser: vi.fn(),
    permanentlyDeleteUserData: vi.fn(),
  };
  const deps: UserDeleteUsecaseDeps = {
    deletionRepo,
    txRunner: {
      run: async (repos, operation) => operation(Object.assign({}, ...repos)),
    },
    deleteUserFiles: vi.fn(async () => {}),
  };
  return { deps, ids, deletionRepo };
}

describe("scheduled deletion batch", () => {
  it("continues past a failed account and reports failure separately", async () => {
    const f = setup();
    vi.mocked(f.deps.deleteUserFiles).mockRejectedValueOnce(
      new Error("R2 unavailable"),
    );
    expect(await cleanupExpiredUsers(f.deps, new Date())).toEqual({
      candidates: 2,
      deleted: 1,
      failed: 1,
    });
    expect(
      f.deletionRepo.permanentlyDeleteUserData,
    ).toHaveBeenCalledExactlyOnceWith(f.ids[1]);
  });

  it("rechecks eligibility after acquiring the lock", async () => {
    const f = setup();
    f.deletionRepo.lockUserForDeletion.mockResolvedValueOnce(false);
    f.deletionRepo.isUserDeletionDue.mockResolvedValueOnce(false);
    expect(await cleanupExpiredUsers(f.deps, new Date())).toEqual({
      candidates: 2,
      deleted: 0,
      failed: 0,
    });
    expect(f.deps.deleteUserFiles).not.toHaveBeenCalled();
    expect(f.deletionRepo.permanentlyDeleteUserData).not.toHaveBeenCalled();
  });
});
