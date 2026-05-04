import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { describe, expect, it } from "vitest";

import { isMobileClient } from "../clientDetection";

function buildApp() {
  const app = new Hono<AppContext>();
  app.get("/", (c) => c.json({ mobile: isMobileClient(c) }));
  return app;
}

describe("isMobileClient", () => {
  it("Origin ヘッダなしは mobile と判定", async () => {
    const app = buildApp();
    const res = await app.request("/");
    const body = (await res.json()) as { mobile: boolean };
    expect(body.mobile).toBe(true);
  });

  it("Origin ヘッダありは Web と判定", async () => {
    const app = buildApp();
    const res = await app.request("/", {
      headers: { Origin: "https://app.example.com" },
    });
    const body = (await res.json()) as { mobile: boolean };
    expect(body.mobile).toBe(false);
  });

  it("Origin が空文字列の場合は Web 扱い（防御的）", async () => {
    const app = buildApp();
    const res = await app.request("/", { headers: { Origin: "" } });
    const body = (await res.json()) as { mobile: boolean };
    expect(body.mobile).toBe(false);
  });

  it('Origin が文字列 "null" の場合は Web 扱い（sandboxed iframe / file://）', async () => {
    const app = buildApp();
    const res = await app.request("/", { headers: { Origin: "null" } });
    const body = (await res.json()) as { mobile: boolean };
    expect(body.mobile).toBe(false);
  });
});
