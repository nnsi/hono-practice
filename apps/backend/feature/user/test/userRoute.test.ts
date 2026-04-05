import { testClient } from "hono/testing";

import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { userConsents, users } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createUserRoute } from "..";

describe("userRoute", () => {
  it("POST / ユーザー作成が成功する", async () => {
    const route = createUserRoute();
    const client = testClient(route, {
      JWT_SECRET: "test",
      JWT_AUDIENCE: "test-audience",
      NODE_ENV: "test",
      DB: testDB,
    });

    const res = await client.index.$post({
      json: {
        loginId: "loginId",
        password: "testtest",
        name: "test",
        consents: {
          age: true,
          terms: "2026-05-01",
          privacy: "2026-05-01",
        },
      },
    });

    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("POST / signup 時に user_consent に3行記録される", async () => {
    const route = createUserRoute();
    const client = testClient(route, {
      JWT_SECRET: "test",
      JWT_AUDIENCE: "test-audience",
      NODE_ENV: "test",
      DB: testDB,
    });

    const res = await client.index.$post({
      json: {
        loginId: "consent-test-user",
        password: "testtest",
        consents: { age: true, terms: "2026-05-01", privacy: "2026-05-01" },
      },
    });
    expect(res.status).toEqual(200);

    const [user] = await testDB
      .select()
      .from(users)
      .where(eq(users.loginId, "consent-test-user"));
    const confirms = await testDB
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, user.id));
    expect(confirms).toHaveLength(3);
    expect(confirms.map((c) => c.type).sort()).toEqual([
      "age",
      "privacy",
      "terms",
    ]);
    expect(confirms.find((c) => c.type === "age")?.version).toBeNull();
    expect(confirms.find((c) => c.type === "terms")?.version).toBe(
      "2026-05-01",
    );
    expect(confirms.find((c) => c.type === "privacy")?.version).toBe(
      "2026-05-01",
    );
  });

  it("POST / consents 欠落時は 400 エラーになる", async () => {
    const route = createUserRoute();
    const client = testClient(route, {
      JWT_SECRET: "test",
      JWT_AUDIENCE: "test-audience",
      NODE_ENV: "test",
      DB: testDB,
    });

    const res = await client.index.$post({
      // consents を意図的に省略
      json: {
        loginId: "no-consent-user",
        password: "testtest",
      } as Parameters<typeof client.index.$post>[0]["json"],
    });
    expect(res.status).toEqual(400);
  });

  describe("DELETE /me", () => {
    const createAuthClient = () => {
      const route = createUserRoute();
      return testClient(route, {
        DB: testDB,
        JWT_SECRET: "test",
        JWT_AUDIENCE: "test-audience",
        __authenticatedUserId: TEST_USER_ID,
      } as unknown as Parameters<typeof testClient>[1]);
    };

    it("正常系：アカウント削除が成功する（204）", async () => {
      const client = createAuthClient();

      const res = await client.me.$delete();
      expect(res.status).toEqual(204);

      // 削除後にユーザーのdeletedAtがセットされていることをDB直接確認
      const [user] = await testDB
        .select()
        .from(users)
        .where(eq(users.loginId, "test-user"));
      expect(user.deletedAt).not.toBeNull();
    });

    it("削除済みユーザーは/meで取得できない", async () => {
      const client = createAuthClient();

      // まず削除
      await client.me.$delete();

      // 削除後に/meを取得 → user not found → 401
      const res = await client.me.$get();
      expect(res.status).toEqual(401);
    });
  });
});
