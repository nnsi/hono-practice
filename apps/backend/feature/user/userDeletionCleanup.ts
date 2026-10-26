import type { UserDeleteUsecaseDeps } from "./userDeleteUsecase";

// A bounded daily batch. Recheck eligibility under the same lock used by
// withdrawal, so retries and overlapping scheduled invocations are safe.
export async function cleanupExpiredUsers(
  deps: UserDeleteUsecaseDeps,
  now: Date,
) {
  const ids = await deps.deletionRepo.listExpiredUsers(now);
  let deleted = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const removed = await deps.txRunner.run(
        [deps.deletionRepo],
        async (tx) => {
          if (!(await tx.lockUserForDeletion(id))) return;
          if (!(await tx.isUserDeletionDue(id, now))) return;
          await deps.deleteUserFiles(id);
          await tx.permanentlyDeleteUserData(id);
          return true;
        },
      );
      if (removed) deleted++;
    } catch {
      // Keep the DB records on failure and retry on the next invocation.
      // Do not log account IDs or personal data.
      failed++;
    }
  }
  return { candidates: ids.length, deleted, failed };
}
