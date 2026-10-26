import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopTracer } from "@backend/lib/tracer";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import * as schema from "@infra/drizzle/schema";
import { createUserId } from "@packages/domain/user/userSchema";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { newSubscriptionCommandUsecase } from "../../subscription/subscriptionCommandUsecase";
import { newSubscriptionHistoryRepository } from "../../subscription/subscriptionHistoryRepository";
import { newSubscriptionRepository } from "../../subscription/subscriptionRepository";
import { newDeleteUserUsecase } from "../userDeleteUsecase";
import { cleanupExpiredUsers } from "../userDeletionCleanup";
import { newUserDeletionRepository } from "../userDeletionRepository";

const userId = createUserId(TEST_USER_ID);
const activityId = "00000000-0000-4000-8000-000000000001";
function setup(deleteUserFiles = vi.fn(async () => {})) {
  const repo = newUserDeletionRepository(testDB);
  return {
    deleteUserFiles,
    remove: async (_id: typeof userId) => {
      await testDB
        .update(schema.users)
        .set({ deletedAt: new Date("2025-01-01T00:00:00Z") })
        .where(eq(schema.users.id, userId));
      const result = await cleanupExpiredUsers(
        {
          deletionRepo: repo,
          txRunner: newDrizzleTransactionRunner(testDB),
          deleteUserFiles,
        },
        new Date("2026-01-01T00:00:00Z"),
      );
      if (result.failed) throw new Error("storage unavailable or DB failure");
    },
    withdraw: newDeleteUserUsecase(
      {
        deletionRepo: repo,
        txRunner: newDrizzleTransactionRunner(testDB),
        deleteUserFiles,
      },
      noopTracer,
    ),
  };
}
async function seedRelations() {
  const [goal] = await testDB
    .insert(schema.activityGoals)
    .values({
      userId,
      activityId,
      dailyTargetQuantity: 1,
      startDate: "2026-01-01",
    })
    .returning();
  await testDB
    .insert(schema.activityGoalFreezePeriods)
    .values({ userId, goalId: goal.id, startDate: "2026-01-01" });
  const [schedule] = await testDB
    .insert(schema.taskSchedules)
    .values({
      userId,
      activityId,
      activityKindId: activityId,
      title: "schedule",
      recurrenceType: "interval",
      intervalDays: 1,
      startDate: "2026-01-01",
    })
    .returning();
  const [task] = await testDB
    .insert(schema.tasks)
    .values({
      userId,
      activityId,
      activityKindId: activityId,
      scheduleId: schedule.id,
      title: "scheduled task",
    })
    .returning();
  await testDB.update(schema.activityLogs).set({ taskId: task.id });
  await testDB.insert(schema.notes).values({
    userId,
    activityId,
    title: "deleted note",
    deletedAt: new Date(),
  });
  await testDB.insert(schema.userProviders).values({
    userId,
    provider: "google",
    providerAccountId: "google-id",
    email: "private@example.com",
  });
  await testDB.insert(schema.userConsents).values({ userId, type: "terms" });
  await testDB
    .insert(schema.apiKeys)
    .values({ userId, key: "hashed-private", name: "key" });
  const [sub] = await testDB
    .insert(schema.userSubscriptions)
    .values({ userId })
    .returning();
  await testDB.insert(schema.subscriptionHistories).values({
    subscriptionId: sub.id,
    eventType: "created",
    plan: "free",
    status: "trial",
    source: "test",
  });
  await testDB.insert(schema.contacts).values({
    userId,
    email: "private@example.com",
    body: "private",
    ipAddress: "127.0.0.1",
  });
}

describe("permanent account deletion", () => {
  it("withdrawal retains content and images, revokes credentials, and preserves the original withdrawal date", async () => {
    await seedRelations();
    const f = setup();
    await f.withdraw(userId);
    const [first] = await testDB.select().from(schema.users);
    expect(first.deletedAt).toBeInstanceOf(Date);
    expect(await testDB.select().from(schema.notes)).toHaveLength(1);
    expect(await testDB.select().from(schema.userSubscriptions)).toHaveLength(
      1,
    );
    expect(await testDB.select().from(schema.refreshTokens)).toHaveLength(0);
    expect(await testDB.select().from(schema.apiKeys)).toHaveLength(0);
    expect(f.deleteUserFiles).not.toHaveBeenCalled();
    await f.withdraw(userId);
    const [second] = await testDB.select().from(schema.users);
    expect(second.deletedAt).toEqual(first.deletedAt);
  });

  it("uses six calendar months including month-end and excludes active accounts", async () => {
    const repo = newUserDeletionRepository(testDB);
    expect(await repo.listExpiredUsers(new Date("2030-01-01Z"))).toEqual([]);
    await testDB
      .update(schema.users)
      .set({ deletedAt: new Date("2025-08-31T12:00:00Z") });
    expect(
      await repo.listExpiredUsers(new Date("2026-02-28T11:59:59Z")),
    ).toEqual([]);
    expect(
      await repo.listExpiredUsers(new Date("2026-02-28T12:00:00Z")),
    ).toEqual([userId]);
    expect(
      await repo.isUserDeletionDue(userId, new Date("2026-02-28T11:59:59Z")),
    ).toBe(false);
  });

  it("scheduled cleanup keeps data before the deadline and deletes it at the deadline", async () => {
    const files = vi.fn(async () => {});
    const deps = {
      deletionRepo: newUserDeletionRepository(testDB),
      txRunner: newDrizzleTransactionRunner(testDB),
      deleteUserFiles: files,
    };
    await testDB
      .update(schema.users)
      .set({ deletedAt: new Date("2026-01-31T10:00:00Z") });
    expect(
      await cleanupExpiredUsers(deps, new Date("2026-07-31T09:59:59Z")),
    ).toEqual({ candidates: 0, deleted: 0, failed: 0 });
    expect(files).not.toHaveBeenCalled();
    expect(await testDB.select().from(schema.activityLogs)).toHaveLength(1);
    expect(
      await cleanupExpiredUsers(deps, new Date("2026-07-31T10:00:00Z")),
    ).toEqual({ candidates: 1, deleted: 1, failed: 0 });
    expect(await testDB.select().from(schema.users)).toHaveLength(0);
    expect(
      await cleanupExpiredUsers(deps, new Date("2026-08-01T10:00:00Z")),
    ).toEqual({ candidates: 0, deleted: 0, failed: 0 });
    expect(files).toHaveBeenCalledTimes(1);
  });

  it("removes all related data including soft-deleted records, preserves another account, and is idempotent", async () => {
    await seedRelations();
    const otherId = createUserId();
    await testDB.insert(schema.users).values({ id: otherId, loginId: "other" });
    await testDB
      .insert(schema.notes)
      .values({ userId: otherId, title: "keep" });
    const f = setup();
    await f.remove(userId);
    expect(
      await testDB.select().from(schema.subscriptionHistoryArchives),
    ).toMatchObject([{ deletedUserId: userId, eventType: "created" }]);
    for (const table of [
      schema.activities,
      schema.activityLogs,
      schema.activityKinds,
      schema.tasks,
      schema.taskSchedules,
      schema.activityGoals,
      schema.activityGoalFreezePeriods,
      schema.userProviders,
      schema.userConsents,
      schema.apiKeys,
      schema.refreshTokens,
      schema.userSubscriptions,
      schema.subscriptionHistories,
      schema.contacts,
    ]) {
      expect(await testDB.select().from(table)).toHaveLength(0);
    }
    expect(await testDB.select().from(schema.notes)).toMatchObject([
      { userId: otherId, title: "keep" },
    ]);
    expect(await testDB.select().from(schema.users)).toMatchObject([
      { id: otherId },
    ]);
    await f.remove(userId);
    expect(f.deleteUserFiles).toHaveBeenCalledTimes(1);
  });

  it("storage errors retain the account and credentials for retry", async () => {
    const files = vi.fn(async (): Promise<void> => {
      throw new Error("storage unavailable");
    });
    const f = setup(files);
    await expect(f.remove(userId)).rejects.toThrow("storage unavailable");
    expect(await testDB.select().from(schema.users)).toHaveLength(1);
    expect(await testDB.select().from(schema.refreshTokens)).toHaveLength(1);
    files.mockImplementation(async () => {});
    await f.remove(userId);
    expect(await testDB.select().from(schema.users)).toHaveLength(0);
  });

  it("ignores late payment notifications after deletion without recreating records", async () => {
    await setup().remove(userId);
    const command = newSubscriptionCommandUsecase(
      newDrizzleTransactionRunner(testDB),
      newSubscriptionRepository(testDB),
      newSubscriptionHistoryRepository(testDB),
      noopTracer,
    );
    expect(
      await command.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: "old-purchase",
        eventType: "RENEWAL",
        eventOccurredAt: new Date(),
        eventSequence: "renewal-after-delete",
        currentPeriodEnd: new Date(Date.now() + 86400000),
      }),
    ).toBe("ignored");
    expect(await testDB.select().from(schema.userSubscriptions)).toHaveLength(
      0,
    );
  });

  it("a DB failure rolls back all deleted records", async () => {
    await seedRelations();
    // Deliberately add an unknown dependent table: any missed FK must fail
    // closed instead of leaving half-deleted data and reporting success.
    await testDB.execute(
      sql`CREATE TABLE deletion_test_blocker (user_id uuid REFERENCES "user"(id))`,
    );
    try {
      await testDB.execute(
        sql`INSERT INTO deletion_test_blocker VALUES (${userId})`,
      );
      await expect(setup().remove(userId)).rejects.toThrow();
      expect(
        await testDB
          .select()
          .from(schema.notes)
          .where(eq(schema.notes.userId, userId)),
      ).toHaveLength(1);
      expect(await testDB.select().from(schema.activityLogs)).toHaveLength(1);
      expect(await testDB.select().from(schema.users)).toHaveLength(1);
    } finally {
      await testDB.execute(sql`DROP TABLE deletion_test_blocker`);
    }
  });
});
