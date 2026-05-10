import { newApiKeyRepository } from "@backend/feature/apiKey";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { apiKeyAuthMiddleware } from "@backend/middleware/apiKeyAuth";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { userSubscriptions, users } from "@infra/drizzle/schema";
import { createApiKeyId } from "@packages/domain/apiKey/apiKeySchema";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";
import { describe, expect, it } from "vitest";

function createApp() {
  const app = newHonoWithErrorHandling();
  app.use("*", apiKeyAuthMiddleware);
  app.get("/", (c) =>
    c.json({
      userId: c.get("userId"),
      scopes: c.get("apiKeyScopes"),
    }),
  );

  return app;
}

function requestWithApiKey(rawKey: string) {
  return createApp().request(
    "/",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${rawKey}` },
    },
    {
      DB: testDB,
      NODE_ENV: "test",
    },
  );
}

async function createApiKey(rawKey: string) {
  return newApiKeyRepository(testDB).createApiKey({
    id: createApiKeyId(),
    userId: TEST_USER_ID,
    key: rawKey,
    name: "middleware test key",
    scopes: ["all"],
  });
}

async function createSubscription(
  plan: "free" | "premium",
  status: "active" | "expired" = "active",
) {
  await testDB.insert(userSubscriptions).values({
    id: v7(),
    userId: TEST_USER_ID,
    plan,
    status,
    paymentProvider: null,
    paymentProviderId: null,
  });
}

describe("apiKeyAuthMiddleware", () => {
  it("active premium user の API key は通す", async () => {
    const rawKey = "api_valid_premium";
    await createApiKey(rawKey);
    await createSubscription("premium");

    const res = await requestWithApiKey(rawKey);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(TEST_USER_ID);
    expect(body.scopes).toEqual(["all"]);
  });

  it("premium subscription がない API key は拒否する", async () => {
    const rawKey = "api_no_subscription";
    await createApiKey(rawKey);

    const res = await requestWithApiKey(rawKey);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      message: "Premium subscription required",
    });
  });

  it("free plan の API key は拒否する", async () => {
    const rawKey = "api_free_subscription";
    await createApiKey(rawKey);
    await createSubscription("free");

    const res = await requestWithApiKey(rawKey);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      message: "Premium subscription required",
    });
  });

  it("expired premium の API key は拒否する", async () => {
    const rawKey = "api_expired_premium";
    await createApiKey(rawKey);
    await createSubscription("premium", "expired");

    const res = await requestWithApiKey(rawKey);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      message: "Premium subscription required",
    });
  });

  it("削除済みユーザーの API key は拒否する", async () => {
    const rawKey = "api_deleted_user";
    await createApiKey(rawKey);
    await createSubscription("premium");
    await testDB
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, TEST_USER_ID));

    const res = await requestWithApiKey(rawKey);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Invalid API key" });
  });
});
