import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { userConsents } from "@infra/drizzle/schema";
import type {
  UserConsent,
  UserConsentType,
} from "@packages/domain/user/userConsentSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";

export type UserConsentRepository<T = QueryExecutor> = {
  createUserConsents: (entities: UserConsent[]) => Promise<void>;
  getUserConsentsByUserId: (userId: UserId) => Promise<UserConsent[]>;
  hardDeleteUserConsentsByUserId: (userId: UserId) => Promise<number>;
  withTx: (tx: T) => UserConsentRepository<T>;
};

export function newUserConsentRepository(
  db: QueryExecutor,
): UserConsentRepository<QueryExecutor> {
  return {
    createUserConsents: createUserConsents(db),
    getUserConsentsByUserId: getUserConsentsByUserId(db),
    hardDeleteUserConsentsByUserId: hardDeleteUserConsentsByUserId(db),
    withTx: (tx) => newUserConsentRepository(tx),
  };
}

function createUserConsents(db: QueryExecutor) {
  return async (entities: UserConsent[]): Promise<void> => {
    if (entities.length === 0) return;
    await db.insert(userConsents).values(
      entities.map((entity) => ({
        id: entity.id,
        userId: entity.userId,
        type: entity.type as UserConsentType,
        version: entity.version,
        confirmedAt: entity.confirmedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      })),
    );
  };
}

function getUserConsentsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<UserConsent[]> => {
    const rows = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId));
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId as UserId,
      type: row.type as UserConsentType,
      version: row.version,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  };
}

function hardDeleteUserConsentsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(userConsents)
      .where(eq(userConsents.userId, userId))
      .returning();
    return result.length;
  };
}
