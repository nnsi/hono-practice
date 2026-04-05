import { sign } from "hono/jwt";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { testDB } from "@backend/test.setup";
import * as schema from "@infra/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { adminRoute } from "..";

function createTestApp() {
  return newHonoWithErrorHandling().route("/", adminRoute);
}

const JWT_SECRET = "test-admin-jwt-secret-must-be-32-chars-long";
const JWT_AUDIENCE = "test-admin-aud";
const TEST_ADMIN_EMAIL = "test-admin@example.com";

async function signAdminToken() {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      email: TEST_ADMIN_EMAIL,
      role: "admin",
      aud: JWT_AUDIENCE,
      iat: now,
      exp: now + 3600,
    },
    JWT_SECRET,
    "HS256",
  );
}

function makeBindings() {
  return {
    DB: testDB,
    JWT_SECRET,
    JWT_AUDIENCE,
    NODE_ENV: "test",
  };
}

const DELETE_USER_ID = "bbbb1111-0000-4000-8000-000000000001";
const DELETE_USER_LOGIN_ID = "delete-target@example.com";
const DELETE_ACTIVITY_ID = "bbbb1111-0000-4000-8000-000000000002";
const DELETE_ACTIVITY_KIND_ID = "bbbb1111-0000-4000-8000-000000000003";
const DELETE_TASK_ID = "bbbb1111-0000-4000-8000-000000000004";
const DELETE_ACTIVITY_LOG_ID = "bbbb1111-0000-4000-8000-000000000005";
const DELETE_GOAL_ID = "bbbb1111-0000-4000-8000-000000000006";
const DELETE_SUBSCRIPTION_ID = "bbbb1111-0000-4000-8000-000000000007";
const DELETE_SUBSCRIPTION_HISTORY_ID = "bbbb1111-0000-4000-8000-000000000008";

async function seedDeleteTarget() {
  await testDB.insert(schema.users).values({
    id: DELETE_USER_ID,
    loginId: DELETE_USER_LOGIN_ID,
    password: "hashed_pw_123",
    name: "削除対象ユーザー",
  });
  await testDB.insert(schema.activities).values({
    id: DELETE_ACTIVITY_ID,
    userId: DELETE_USER_ID,
    name: "test-activity",
    label: "",
    quantityUnit: "回",
    orderIndex: "a",
    iconType: "emoji",
  });
  await testDB.insert(schema.activityKinds).values({
    id: DELETE_ACTIVITY_KIND_ID,
    activityId: DELETE_ACTIVITY_ID,
    name: "test-kind",
    orderIndex: "a",
  });
  // task が activity_kind を FK 参照するケース（FK 順序違反の回帰検出用）
  await testDB.insert(schema.tasks).values({
    id: DELETE_TASK_ID,
    userId: DELETE_USER_ID,
    activityId: DELETE_ACTIVITY_ID,
    activityKindId: DELETE_ACTIVITY_KIND_ID,
    title: "fk-test-task",
  });
  await testDB.insert(schema.activityLogs).values({
    id: DELETE_ACTIVITY_LOG_ID,
    userId: DELETE_USER_ID,
    activityId: DELETE_ACTIVITY_ID,
    activityKindId: DELETE_ACTIVITY_KIND_ID,
    taskId: DELETE_TASK_ID,
    date: "2026-01-01",
    quantity: 1,
  });
  await testDB.insert(schema.activityGoals).values({
    id: DELETE_GOAL_ID,
    userId: DELETE_USER_ID,
    activityId: DELETE_ACTIVITY_ID,
    dailyTargetQuantity: 10,
    startDate: "2026-01-01",
    isActive: true,
  });
  await testDB.insert(schema.userSubscriptions).values({
    id: DELETE_SUBSCRIPTION_ID,
    userId: DELETE_USER_ID,
    plan: "premium",
    status: "active",
    paymentProvider: "stripe",
    priceCurrency: "JPY",
  });
  await testDB.insert(schema.subscriptionHistories).values({
    id: DELETE_SUBSCRIPTION_HISTORY_ID,
    subscriptionId: DELETE_SUBSCRIPTION_ID,
    eventType: "created",
    plan: "premium",
    status: "active",
    source: "stripe",
  });
}

describe("DELETE /admin/users/:id", () => {
  beforeEach(async () => {
    await seedDeleteTarget();
  });

  it("正常系: admin JWT で削除すると全関連データが物理削除され archive/audit log が記録される", async () => {
    const token = await signAdminToken();
    const client = testClient(createTestApp(), makeBindings());

    const res = await client.users[":id"].$delete(
      {
        param: { id: DELETE_USER_ID },
        json: { loginIdConfirmation: DELETE_USER_LOGIN_ID },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedUserId).toBe(DELETE_USER_ID);
    expect(body.deletionCounts.user).toBe(1);
    expect(body.deletionCounts.activities).toBe(1);
    expect(body.deletionCounts.activityKinds).toBe(1);
    expect(body.deletionCounts.tasks).toBe(1);
    expect(body.deletionCounts.activityLogs).toBe(1);
    expect(body.deletionCounts.activityGoals).toBe(1);
    expect(body.deletionCounts.userSubscriptions).toBe(1);
    expect(body.deletionCounts.subscriptionHistoriesArchived).toBe(1);

    // DB検証: user と関連テーブルすべて消えている
    const remainingUser = await testDB.query.users.findFirst({
      where: eq(schema.users.id, DELETE_USER_ID),
    });
    expect(remainingUser).toBeUndefined();

    const remainingActivity = await testDB.query.activities.findFirst({
      where: eq(schema.activities.id, DELETE_ACTIVITY_ID),
    });
    expect(remainingActivity).toBeUndefined();

    const remainingActivityKind = await testDB.query.activityKinds.findFirst({
      where: eq(schema.activityKinds.id, DELETE_ACTIVITY_KIND_ID),
    });
    expect(remainingActivityKind).toBeUndefined();

    const remainingTask = await testDB.query.tasks.findFirst({
      where: eq(schema.tasks.id, DELETE_TASK_ID),
    });
    expect(remainingTask).toBeUndefined();

    // subscription_history_archive に移送されている
    const archives = await testDB.query.subscriptionHistoryArchives.findMany({
      where: eq(
        schema.subscriptionHistoryArchives.deletedUserId,
        DELETE_USER_ID,
      ),
    });
    expect(archives).toHaveLength(1);
    expect(archives[0].originalHistoryId).toBe(DELETE_SUBSCRIPTION_HISTORY_ID);
    expect(archives[0].originalSubscriptionId).toBe(DELETE_SUBSCRIPTION_ID);
    expect(archives[0].deletedLoginId).toBe(DELETE_USER_LOGIN_ID);

    // 元の subscription_history は削除されている
    const remainingHistory = await testDB.query.subscriptionHistories.findFirst(
      {
        where: eq(
          schema.subscriptionHistories.id,
          DELETE_SUBSCRIPTION_HISTORY_ID,
        ),
      },
    );
    expect(remainingHistory).toBeUndefined();

    // admin_user_deletion_log に監査レコード
    const auditLogs = await testDB.query.adminUserDeletionLogs.findMany({
      where: eq(schema.adminUserDeletionLogs.deletedUserId, DELETE_USER_ID),
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].deletedLoginId).toBe(DELETE_USER_LOGIN_ID);
    expect(auditLogs[0].deletedName).toBe("削除対象ユーザー");
    expect(auditLogs[0].performedByAdminEmail).toBe(TEST_ADMIN_EMAIL);
  });

  it("user が存在しない場合は 404", async () => {
    const token = await signAdminToken();
    const client = testClient(createTestApp(), makeBindings());

    const res = await client.users[":id"].$delete(
      {
        param: { id: "00000000-0000-4000-8000-999999999999" },
        json: { loginIdConfirmation: "anything" },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status).toBe(404);
  });

  it("loginId 不一致の場合は 400", async () => {
    const token = await signAdminToken();
    const client = testClient(createTestApp(), makeBindings());

    const res = await client.users[":id"].$delete(
      {
        param: { id: DELETE_USER_ID },
        json: { loginIdConfirmation: "wrong@example.com" },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status).toBe(400);

    // user は削除されていない（ロールバック確認）
    const remainingUser = await testDB.query.users.findFirst({
      where: and(eq(schema.users.id, DELETE_USER_ID)),
    });
    expect(remainingUser).toBeDefined();
  });

  it("Authorization ヘッダがない場合は 401", async () => {
    const client = testClient(createTestApp(), makeBindings());

    const res = await client.users[":id"].$delete({
      param: { id: DELETE_USER_ID },
      json: { loginIdConfirmation: DELETE_USER_LOGIN_ID },
    });

    expect(res.status).toBe(401);
  });

  it("role != admin の JWT では 403", async () => {
    const now = Math.floor(Date.now() / 1000);
    const nonAdminToken = await sign(
      {
        email: "user@example.com",
        role: "user",
        aud: JWT_AUDIENCE,
        iat: now,
        exp: now + 3600,
      },
      JWT_SECRET,
      "HS256",
    );
    const client = testClient(createTestApp(), makeBindings());

    const res = await client.users[":id"].$delete(
      {
        param: { id: DELETE_USER_ID },
        json: { loginIdConfirmation: DELETE_USER_LOGIN_ID },
      },
      { headers: { Authorization: `Bearer ${nonAdminToken}` } },
    );

    expect(res.status).toBe(403);
  });
});
