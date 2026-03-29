import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { describe, expect, it } from "vitest";

import { requireResourceScope, requireScope } from "../scopeGuard";

function createTestApp(requiredScopes: ApiKeyScope[]) {
  const wrapper = newHonoWithErrorHandling();

  wrapper.use("*", requireScope(...requiredScopes));
  wrapper.get("/test", (c) => c.json({ ok: true }));

  return wrapper;
}

function createResourceTestApp(resource: string) {
  const wrapper = newHonoWithErrorHandling();

  wrapper.use("*", requireResourceScope(resource));
  wrapper.get("/test", (c) => c.json({ ok: true }));
  wrapper.post("/test", (c) => c.json({ ok: true }));

  return wrapper;
}

function wrapWithScopes(app: Hono<AppContext>, scopes: ApiKeyScope[]) {
  const outer = new Hono<AppContext>();
  outer.use("*", async (c, next) => {
    c.set("apiKeyScopes", scopes);
    return next();
  });
  outer.route("/", app);
  return outer;
}

describe("requireScope", () => {
  it('"all" スコープは全エンドポイントにアクセス可能', async () => {
    const app = wrapWithScopes(createTestApp(["voice"]), ["all"]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it("必要なスコープを持っていればアクセス可能", async () => {
    const app = wrapWithScopes(createTestApp(["voice"]), ["voice"]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it("必要なスコープを持っていなければ403", async () => {
    const app = wrapWithScopes(createTestApp(["voice"]), ["tasks:read"]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(403);
  });

  it("複数スコープのうち1つでもマッチすればアクセス可能", async () => {
    const app = wrapWithScopes(
      createTestApp(["activity-logs:read", "tasks:read"]),
      ["tasks:read"],
    );
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it("apiKeyScopes 未設定時はスキップ（セッション認証経由）", async () => {
    const app = createTestApp(["voice"]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });
});

describe("requireResourceScope", () => {
  it("GET → :read スコープで許可", async () => {
    const app = wrapWithScopes(createResourceTestApp("activity-logs"), [
      "activity-logs:read",
    ]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it("POST → :write スコープで許可", async () => {
    const app = wrapWithScopes(createResourceTestApp("tasks"), ["tasks:write"]);
    const res = await app.request(
      new Request("http://localhost/test", { method: "POST" }),
    );
    expect(res.status).toBe(200);
  });

  it("GET で :write のみ持っている場合は403", async () => {
    const app = wrapWithScopes(createResourceTestApp("activity-logs"), [
      "activity-logs:write",
    ]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(403);
  });

  it("POST で :read のみ持っている場合は403", async () => {
    const app = wrapWithScopes(createResourceTestApp("tasks"), ["tasks:read"]);
    const res = await app.request(
      new Request("http://localhost/test", { method: "POST" }),
    );
    expect(res.status).toBe(403);
  });

  it('"all" スコープはリソーススコープも全許可', async () => {
    const app = wrapWithScopes(createResourceTestApp("activity-logs"), ["all"]);
    const res = await app.request(
      new Request("http://localhost/test", { method: "POST" }),
    );
    expect(res.status).toBe(200);
  });

  it("apiKeyScopes 未設定時はスキップ", async () => {
    const app = createResourceTestApp("tasks");
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });
});
