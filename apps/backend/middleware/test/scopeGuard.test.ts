import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { describe, expect, it } from "vitest";

import { requireScope } from "../scopeGuard";

function createTestApp(allowedScopes: ("all" | "voice")[]) {
  const wrapper = newHonoWithErrorHandling();

  wrapper.use("*", requireScope(...allowedScopes));
  wrapper.get("/test", (c) => c.json({ ok: true }));

  return wrapper;
}

function wrapWithScope(app: Hono<AppContext>, scope: "all" | "voice") {
  const outer = new Hono<AppContext>();
  outer.use("*", async (c, next) => {
    c.set("apiKeyScope", scope);
    return next();
  });
  outer.route("/", app);
  return outer;
}

describe("scopeGuard", () => {
  it('scope "all" でアクセス可能', async () => {
    const app = wrapWithScope(createTestApp(["all"]), "all");
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it('scope "voice" で "all" のみ許可のルートにアクセス不可', async () => {
    const app = wrapWithScope(createTestApp(["all"]), "voice");
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(403);
  });

  it('scope "voice" で "all" | "voice" 許可のルートにアクセス可能', async () => {
    const app = wrapWithScope(createTestApp(["all", "voice"]), "voice");
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });

  it("apiKeyScope 未設定時はスキップ（セッション認証経由）", async () => {
    const app = createTestApp(["all"]);
    const res = await app.request(new Request("http://localhost/test"));
    expect(res.status).toBe(200);
  });
});
