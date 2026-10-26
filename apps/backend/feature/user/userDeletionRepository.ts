import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  activities,
  activityGoalFreezePeriods,
  activityGoals,
  activityKinds,
  activityLogs,
  apiKeys,
  contacts,
  notes,
  refreshTokens,
  subscriptionHistories,
  subscriptionHistoryArchives,
  taskSchedules,
  tasks,
  userConsents,
  userProviders,
  userSubscriptions,
  users,
} from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

export type UserDeletionRepository = {
  withTx: (tx: QueryExecutor) => UserDeletionRepository;
  lockUserForDeletion: (userId: UserId) => Promise<boolean>;
  deactivateUser: (userId: UserId) => Promise<void>;
  listExpiredUsers: (now: Date) => Promise<UserId[]>;
  isUserDeletionDue: (userId: UserId, now: Date) => Promise<boolean>;
  permanentlyDeleteUserData: (userId: UserId) => Promise<void>;
};

export function newUserDeletionRepository(
  db: QueryExecutor,
): UserDeletionRepository {
  return {
    withTx: (tx: QueryExecutor): UserDeletionRepository =>
      newUserDeletionRepository(tx),
    async deactivateUser(userId) {
      await db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)));
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
      await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
    },
    async listExpiredUsers(now) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(
          sql`(${users.deletedAt} AT TIME ZONE 'UTC') + interval '6 months' <= (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')`,
        )
        .orderBy(users.deletedAt, users.id)
        .limit(100);
      return rows.map((row) => row.id as UserId);
    },
    async isUserDeletionDue(userId, now) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            sql`(${users.deletedAt} AT TIME ZONE 'UTC') + interval '6 months' <= (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')`,
          ),
        );
      return rows.length > 0;
    },
    // Hold the parent and image metadata locks until storage cleanup and DB
    // deletion complete. New FK inserts wait and then fail if deletion commits.
    async lockUserForDeletion(userId: UserId): Promise<boolean> {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (rows.length === 0) return false;
      await db
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.userId, userId))
        .for("update");
      return true;
    },
    async permanentlyDeleteUserData(userId: UserId): Promise<void> {
      // Preserve the existing admin-deletion archive semantics. This archive
      // is not a replacement for statutory accounting/settlement records.
      const [user] = await db
        .select({ loginId: users.loginId })
        .from(users)
        .where(eq(users.id, userId));
      const histories = await db
        .select({ history: subscriptionHistories })
        .from(subscriptionHistories)
        .innerJoin(
          userSubscriptions,
          eq(subscriptionHistories.subscriptionId, userSubscriptions.id),
        )
        .where(eq(userSubscriptions.userId, userId));
      if (histories.length > 0) {
        await db.insert(subscriptionHistoryArchives).values(
          histories.map(({ history }) => ({
            originalHistoryId: history.id,
            originalSubscriptionId: history.subscriptionId,
            deletedUserId: userId,
            deletedLoginId: user?.loginId ?? "",
            eventType: history.eventType,
            plan: history.plan,
            status: history.status,
            source: history.source,
            webhookId: history.webhookId,
            originalCreatedAt: history.createdAt,
          })),
        );
      }
      await db
        .delete(activityGoalFreezePeriods)
        .where(eq(activityGoalFreezePeriods.userId, userId));
      await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
      await db.delete(activityGoals).where(eq(activityGoals.userId, userId));
      await db.delete(notes).where(eq(notes.userId, userId));
      await db.delete(tasks).where(eq(tasks.userId, userId));
      await db.delete(taskSchedules).where(eq(taskSchedules.userId, userId));
      await db
        .delete(activityKinds)
        .where(
          inArray(
            activityKinds.activityId,
            db
              .select({ id: activities.id })
              .from(activities)
              .where(eq(activities.userId, userId)),
          ),
        );
      await db.delete(activities).where(eq(activities.userId, userId));
      await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
      await db.delete(userProviders).where(eq(userProviders.userId, userId));
      await db
        .delete(subscriptionHistories)
        .where(
          inArray(
            subscriptionHistories.subscriptionId,
            db
              .select({ id: userSubscriptions.id })
              .from(userSubscriptions)
              .where(eq(userSubscriptions.userId, userId)),
          ),
        );
      await db
        .delete(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));
      await db.delete(contacts).where(eq(contacts.userId, userId));
      await db.delete(userConsents).where(eq(userConsents.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    },
  };
}
