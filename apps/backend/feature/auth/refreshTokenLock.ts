import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { refreshTokens, users } from "@infra/drizzle/schema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";

import { parseCombinedToken } from "./refreshTokenIO";

// Call inside the transaction that consumes/inserts/revokes tokens. A user row
// also serializes account deletion and revocation across all of its families.
export async function lockRefreshTokenUser(db: QueryExecutor, userId: UserId) {
  const [user] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  return user;
}

export async function findRefreshTokenForUpdate(
  db: QueryExecutor,
  combinedToken: string,
) {
  const parsed = parseCombinedToken(combinedToken);
  if (!parsed) return { reason: "malformed" } as const;
  const [selector, plainToken] = parsed;
  const [candidate] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.selector, selector))
    .limit(1);
  if (!candidate) return { reason: "not_found" } as const;
  if ((await hashWithSHA256(plainToken)) !== candidate.token)
    return { reason: "hash_mismatch" } as const;
  // Verify the secret before locking to avoid letting a guessed selector block
  // somebody else's session. Re-read after the lock to observe a prior commit.
  const user = await lockRefreshTokenUser(db, createUserId(candidate.userId));
  if (!user || user.deletedAt) return { reason: "user_not_found" } as const;
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.id, candidate.id))
    .limit(1);
  if (!row) return { reason: "not_found" } as const;
  return { row } as const;
}

export async function withRefreshTokenUserLock<T>(
  db: QueryExecutor,
  userId: UserId,
  operation: (tx: QueryExecutor) => Promise<T>,
): Promise<T> {
  const run = async (tx: QueryExecutor) => {
    await lockRefreshTokenUser(tx, userId);
    return operation(tx);
  };
  return db.transaction ? db.transaction(run) : run(db);
}
