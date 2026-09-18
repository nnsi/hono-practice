import { sign } from "hono/jwt";

import { authUserCache } from "@backend/lib/authUserCache";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { type Tracer, createTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { users } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

const JWT_SECRET = "test";
const JWT_AUDIENCE = "test-audience";

async function createToken(userId: string) {
  return sign(
    { userId, aud: JWT_AUDIENCE, exp: Math.floor(Date.now() / 1000) + 60 },
    JWT_SECRET,
    "HS256",
  );
}

async function request(token: string) {
  const tracer: Tracer = createTracer();
  const app = newHonoWithErrorHandling();
  app.use("*", async (c, next) => {
    c.set("tracer", tracer);
    await next();
  });
  app.use("*", authMiddleware);
  app.get("/", (c) =>
    c.json({ userId: c.get("userId"), hasUser: c.get("user") !== undefined }),
  );
  const res = await app.request(
    "/",
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    { DB: testDB, JWT_SECRET, JWT_AUDIENCE, NODE_ENV: "test" },
  );
  return { res, dbSpans: tracer.getSummary().spanCount };
}

describe("authMiddleware", () => {
  beforeEach(() => {
    authUserCache.clear();
  });

  it("初回は DB でユーザーを確認し user を context に載せる", async () => {
    const { res, dbSpans } = await request(await createToken(TEST_USER_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: TEST_USER_ID, hasUser: true });
    expect(dbSpans).toBe(1);
  });

  it("2 回目は cache により DB を引かず、user は context に載せない", async () => {
    const token = await createToken(TEST_USER_ID);
    await request(token);
    const { res, dbSpans } = await request(token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: TEST_USER_ID, hasUser: false });
    expect(dbSpans).toBe(0);
  });

  it("存在しないユーザーは 401 で、cache にも残らない", async () => {
    const token = await createToken("00000000-0000-4000-8000-0000000000ff");
    expect((await request(token)).res.status).toBe(401);
    const second = await request(token);
    expect(second.res.status).toBe(401);
    expect(second.dbSpans).toBe(1);
  });

  it("削除済みユーザーは cache 無効化後に 401 になる", async () => {
    const token = await createToken(TEST_USER_ID);
    expect((await request(token)).res.status).toBe(200);

    await testDB
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, TEST_USER_ID));

    // 別 isolate 相当: cache が残っていれば TTL 内は通る
    expect((await request(token)).res.status).toBe(200);

    // 削除 usecase が行う invalidate 相当
    authUserCache.invalidate(TEST_USER_ID);
    expect((await request(token)).res.status).toBe(401);
  });

  it("aud が違う token は DB を引かずに 401", async () => {
    const token = await sign(
      {
        userId: TEST_USER_ID,
        aud: "other",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      JWT_SECRET,
      "HS256",
    );
    const { res, dbSpans } = await request(token);
    expect(res.status).toBe(401);
    expect(dbSpans).toBe(0);
  });
});
