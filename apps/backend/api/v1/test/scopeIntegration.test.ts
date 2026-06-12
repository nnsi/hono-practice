import type { Next } from "hono";

import type { HonoContext } from "@backend/context";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it } from "vitest";

import { createApiV1Route } from "..";

function createMockAuth(scopes: ApiKeyScope[]) {
  return async (c: HonoContext, next: Next) => {
    c.set("userId", createUserId(TEST_USER_ID));
    c.set("apiKeyScopes", scopes);
    return next();
  };
}

function buildApp(scopes: ApiKeyScope[]) {
  const v1 = createApiV1Route(createMockAuth(scopes));
  const wrapper = newHonoWithErrorHandling();
  wrapper.route("/", v1);
  return wrapper;
}

function req(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function call(
  scopes: ApiKeyScope[],
  path: string,
  method = "GET",
  body?: unknown,
) {
  const app = buildApp(scopes);
  return app.fetch(req(path, method, body), { DB: testDB });
}

// scope middleware が通った後は downstream で 200/201/400/404/500 を返す（body 不正や未存在 ID、
// handler が DB に触れない等の理由で）。403 だけでは「403 以外なら pass」の弱いアサーションになるので
// allow-list で明示する。500 は downstream で DB 不存在等で起こり得るが scope 通過は確認できる。
// 201 は内部 route を再マウントしているため POST 作成の統一（200→201）を継承した結果。
const SCOPE_ALLOWED = new Set([200, 201, 400, 404, 500]);

function expectScopeAllowed(status: number) {
  expect(
    { actual: status, allowed: [...SCOPE_ALLOWED] },
    `scope should have passed but got ${status}`,
  ).toSatisfy((v: { actual: number }) => SCOPE_ALLOWED.has(v.actual));
}

describe("api/v1 scope integration (V1_SCOPE_MAPPING 経由)", () => {
  describe("activity-logs リソース", () => {
    it("GET /activity-logs は activity-logs:read で通過する", async () => {
      const res = await call(
        ["activity-logs:read"],
        "/activity-logs?date=2026-04-12",
      );
      expectScopeAllowed(res.status);
    });

    it("GET /activity-logs は tasks:read のみでは 403", async () => {
      const res = await call(["tasks:read"], "/activity-logs?date=2026-04-12");
      expect(res.status).toBe(403);
    });

    it("POST /activity-logs は activity-logs:read のみでは 403", async () => {
      const res = await call(["activity-logs:read"], "/activity-logs", "POST", {
        quantity: 1,
        date: "2026-04-12",
      });
      expect(res.status).toBe(403);
    });

    it("POST /activity-logs は activity-logs:write で通過する", async () => {
      const res = await call(
        ["activity-logs:write"],
        "/activity-logs",
        "POST",
        {
          quantity: 1,
          date: "2026-04-12",
        },
      );
      expectScopeAllowed(res.status);
    });

    it("PUT /activity-logs/:id は activity-logs:read のみでは 403", async () => {
      const res = await call(
        ["activity-logs:read"],
        "/activity-logs/00000000-0000-0000-0000-000000000000",
        "PUT",
        { quantity: 2 },
      );
      expect(res.status).toBe(403);
    });

    it("PUT /activity-logs/:id は activity-logs:write で通過する", async () => {
      const res = await call(
        ["activity-logs:write"],
        "/activity-logs/00000000-0000-0000-0000-000000000000",
        "PUT",
        { quantity: 2 },
      );
      expectScopeAllowed(res.status);
    });

    it("DELETE /activity-logs/:id は activity-logs:write で通過する", async () => {
      const res = await call(
        ["activity-logs:write"],
        "/activity-logs/00000000-0000-0000-0000-000000000000",
        "DELETE",
      );
      expectScopeAllowed(res.status);
    });
  });

  describe("tasks リソース", () => {
    it("GET /tasks は tasks:read で通過する", async () => {
      const res = await call(["tasks:read"], "/tasks");
      expectScopeAllowed(res.status);
    });

    it("GET /tasks/archived は tasks:read で通過する (prefix + '/' 分岐)", async () => {
      const res = await call(["tasks:read"], "/tasks/archived");
      expectScopeAllowed(res.status);
    });

    it("POST /tasks は tasks:read のみでは 403", async () => {
      const res = await call(["tasks:read"], "/tasks", "POST", {
        title: "test",
        startDate: "2026-04-12",
      });
      expect(res.status).toBe(403);
    });

    it("POST /tasks は tasks:write で通過する", async () => {
      const res = await call(["tasks:write"], "/tasks", "POST", {
        title: "test",
        startDate: "2026-04-12",
      });
      expectScopeAllowed(res.status);
    });

    it("PUT /tasks/:id は tasks:write で通過する", async () => {
      const res = await call(
        ["tasks:write"],
        "/tasks/00000000-0000-0000-0000-000000000000",
        "PUT",
        { title: "updated" },
      );
      expectScopeAllowed(res.status);
    });

    it("DELETE /tasks/:id は tasks:read のみでは 403", async () => {
      const res = await call(
        ["tasks:read"],
        "/tasks/00000000-0000-0000-0000-000000000000",
        "DELETE",
      );
      expect(res.status).toBe(403);
    });

    it("DELETE /tasks/:id は tasks:write で通過する", async () => {
      const res = await call(
        ["tasks:write"],
        "/tasks/00000000-0000-0000-0000-000000000000",
        "DELETE",
      );
      expectScopeAllowed(res.status);
    });
  });

  describe("ai リソース (voice スコープ固定)", () => {
    it("POST /ai/activity-logs/from-speech は voice で通過する", async () => {
      const res = await call(
        ["voice"],
        "/ai/activity-logs/from-speech",
        "POST",
        { speechText: "test" },
      );
      expectScopeAllowed(res.status);
    });

    it("POST /ai/activity-logs/from-speech は activity-logs:write では 403 (/activity-logs prefix と誤一致しない)", async () => {
      const res = await call(
        ["activity-logs:write"],
        "/ai/activity-logs/from-speech",
        "POST",
        { speechText: "test" },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('"all" スコープ', () => {
    it("GET /activity-logs を許可", async () => {
      const res = await call(["all"], "/activity-logs?date=2026-04-12");
      expectScopeAllowed(res.status);
    });

    it("POST /tasks を許可", async () => {
      const res = await call(["all"], "/tasks", "POST", {
        title: "test",
        startDate: "2026-04-12",
      });
      expectScopeAllowed(res.status);
    });

    it("POST /ai/activity-logs/from-speech を許可", async () => {
      const res = await call(["all"], "/ai/activity-logs/from-speech", "POST", {
        speechText: "test",
      });
      expectScopeAllowed(res.status);
    });
  });

  describe("境界ケース", () => {
    it("空 scope 配列では保護された全エンドポイントが 403", async () => {
      const paths: Array<[string, string, unknown?]> = [
        ["/activity-logs?date=2026-04-12", "GET"],
        ["/tasks", "GET"],
        ["/ai/activity-logs/from-speech", "POST", { speechText: "test" }],
      ];
      for (const [path, method, body] of paths) {
        const res = await call([], path, method, body);
        expect(res.status).toBe(403);
      }
    });
  });
});
