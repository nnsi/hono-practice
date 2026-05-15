import { testClient } from "hono/testing";

import { TEST_USER_ID, testDB } from "@backend/test.setup";
import {
  apiKeys,
  refreshTokens,
  userConsents,
  users,
} from "@infra/drizzle/schema";
import { hashApiKey } from "@packages/domain/apiKey/apiKeySchema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createUserRoute } from "..";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expectAuthResponse(body: unknown): asserts body is {
  token: string;
  refreshToken: string;
  user: { id: string; plan: string };
} {
  if (
    !isRecord(body) ||
    typeof body.token !== "string" ||
    typeof body.refreshToken !== "string" ||
    !isRecord(body.user) ||
    typeof body.user.id !== "string" ||
    typeof body.user.plan !== "string"
  ) {
    throw new Error("auth response is invalid");
  }
}

function expectTabPreferenceResponse(
  body: unknown,
): asserts body is { tabs: string[]; updatedAt?: string } {
  if (
    !isRecord(body) ||
    !Array.isArray(body.tabs) ||
    !body.tabs.every((tab) => typeof tab === "string")
  ) {
    throw new Error("tab preference response is invalid");
  }
}

describe("userRoute", () => {
  const createAuthClient = () => {
    const route = createUserRoute();
    return testClient(route, {
      DB: testDB,
      JWT_SECRET: "test",
      JWT_AUDIENCE: "test-audience",
      __authenticatedUserId: TEST_USER_ID,
    } as unknown as Parameters<typeof testClient>[1]);
  };

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
    expectAuthResponse(body);
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.id).toEqual(expect.any(String));
    expect(body.user.plan).toBe("free");
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

  it("POST / 重複した loginId は 409 エラーになる", async () => {
    const route = createUserRoute();
    // AppError → 409 マッピングを onError で行うので errorHandling 付きで包む
    const { newHonoWithErrorHandling } = await import(
      "@backend/lib/honoWithErrorHandling"
    );
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, {
      JWT_SECRET: "test",
      JWT_AUDIENCE: "test-audience",
      NODE_ENV: "test",
      DB: testDB,
    });
    const json: Parameters<typeof client.index.$post>[0]["json"] = {
      loginId: "duplicate-user",
      password: "testtest",
      name: "test",
      consents: {
        age: true,
        terms: "2026-05-01",
        privacy: "2026-05-01",
      },
    };

    expect((await client.index.$post({ json })).status).toEqual(200);
    expect((await client.index.$post({ json })).status).toEqual(409);
  });

  describe("tab preference", () => {
    it("GET /me に tabPreference が含まれる", async () => {
      const client = createAuthClient();

      const res = await client.me.$get();

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect("tabPreference" in body).toBe(true);
      if (!("tabPreference" in body)) {
        throw new Error("tabPreference is missing");
      }
      expect(body.tabPreference.tabs).toEqual([
        "home",
        "daily",
        "stats",
        "goals",
        "tasks",
      ]);
    });

    it("GET /tab-preference で現在の設定を取得する", async () => {
      const client = createAuthClient();

      const res = await client["tab-preference"].$get();

      expect(res.status).toEqual(200);
      const body = await res.json();
      expectTabPreferenceResponse(body);
      expect(body.tabs).toEqual(["home", "daily", "stats", "goals", "tasks"]);
    });

    it("PUT /tab-preference で新しい設定を保存する", async () => {
      const client = createAuthClient();
      const updatedAt = "2099-04-12T10:00:00.000Z";

      const res = await client["tab-preference"].$put({
        json: {
          tabs: ["home", "daily", "stats", "notes", "tasks"],
          updatedAt,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expectTabPreferenceResponse(body);
      expect(body.tabs).toEqual(["home", "daily", "stats", "notes", "tasks"]);
      expect(body.updatedAt).toBe(updatedAt);

      const [user] = await testDB
        .select({
          tabs: users.tabPreferences,
          updatedAt: users.tabPreferencesUpdatedAt,
        })
        .from(users)
        .where(eq(users.id, TEST_USER_ID));

      expect(user.tabs).toEqual(["home", "daily", "stats", "notes", "tasks"]);
      expect(user.updatedAt.toISOString()).toBe(updatedAt);
    });

    it("PUT /tab-preference は古い updatedAt を無視して server-wins を返す", async () => {
      const client = createAuthClient();

      await client["tab-preference"].$put({
        json: {
          tabs: ["home", "daily", "stats", "notes", "tasks"],
          updatedAt: "2099-04-12T10:00:00.000Z",
        },
      });

      const res = await client["tab-preference"].$put({
        json: {
          tabs: ["home", "daily", "notes", "goals", "tasks"],
          updatedAt: "2099-04-12T09:00:00.000Z",
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expectTabPreferenceResponse(body);
      expect(body.tabs).toEqual(["home", "daily", "stats", "notes", "tasks"]);
      expect(body.updatedAt).toBe("2099-04-12T10:00:00.000Z");
    });

    it("PUT /tab-preference は不正な payload を 400 で弾く", async () => {
      const client = createAuthClient();
      type PutPayload = Parameters<
        (typeof client)["tab-preference"]["$put"]
      >[0]["json"];
      const invalidPayloads = [
        {
          tabs: ["daily", "home"],
          updatedAt: "2099-04-12T10:00:00.000Z",
        },
        {
          tabs: ["home", "daily", "daily"],
          updatedAt: "2099-04-12T10:00:00.000Z",
        },
        {
          tabs: ["home", "daily", "stats", "goals", "tasks", "notes"],
          updatedAt: "2099-04-12T10:00:00.000Z",
        },
      ];

      for (const json of invalidPayloads) {
        const res = await client["tab-preference"].$put({
          json: json as PutPayload,
        });
        expect(res.status).toEqual(400);
      }
    });
  });

  describe("DELETE /me", () => {
    it("正常系：アカウント削除時にユーザー・refresh token・API keyを失効する", async () => {
      const client = createAuthClient();
      await testDB.insert(apiKeys).values({
        id: "00000000-0000-4000-8000-000000000011",
        userId: TEST_USER_ID,
        key: await hashApiKey("api_delete_target"),
        name: "delete target",
        scopes: ["all"],
        isActive: true,
      });

      const res = await client.me.$delete();
      expect(res.status).toEqual(204);

      const [user] = await testDB
        .select()
        .from(users)
        .where(eq(users.loginId, "test-user"));
      expect(user.deletedAt).not.toBeNull();

      const tokens = await testDB
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, TEST_USER_ID));
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);

      const [apiKey] = await testDB
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, TEST_USER_ID));
      expect(apiKey.deletedAt).not.toBeNull();
      expect(apiKey.isActive).toBe(false);
    });

    it("正常系：アカウント削除時に refresh_token cookie を expire させる Set-Cookie を返す", async () => {
      const client = createAuthClient();

      const res = await client.me.$delete();
      expect(res.status).toEqual(204);

      // backend で revoke 済みでも、ブラウザに失効済み cookie 識別子が残らないよう
      // Set-Cookie で expire させる (Codex Round 2 #2 指摘)
      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain("refresh_token=");
      // Expires=Thu, 01 Jan 1970... (Date(0)) で即時失効
      expect(setCookie).toMatch(/Expires=[A-Za-z]+, 01 Jan 1970/);
    });

    it("削除済みユーザーは/meで取得できない", async () => {
      const client = createAuthClient();

      // まず削除
      await client.me.$delete();

      // 削除後に/meを取得 → user not found → 401
      const res = await client.me.$get();
      expect(res.status).toEqual(401);
    });

    it("削除済みユーザーは /tab-preference を取得・更新できない", async () => {
      const client = createAuthClient();

      await client.me.$delete();

      expect((await client["tab-preference"].$get()).status).toEqual(401);
      expect(
        (
          await client["tab-preference"].$put({
            json: {
              tabs: ["home", "daily", "stats", "notes"],
              updatedAt: "2099-04-12T10:00:00.000Z",
            },
          })
        ).status,
      ).toEqual(401);
    });
  });
});
