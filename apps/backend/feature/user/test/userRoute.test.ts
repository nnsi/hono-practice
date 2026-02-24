import { testClient } from "hono/testing";

import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { users } from "@infra/drizzle/schema";
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
      },
    });

    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  describe("DELETE /me", () => {
    const createAuthClient = () => {
      const route = createUserRoute();
      return testClient(route, {
        DB: testDB,
        JWT_SECRET: "test",
        JWT_AUDIENCE: "test-audience",
        __authenticatedUserId: TEST_USER_ID,
      } as any);
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
