import { Hono } from "hono";

import { describe, expect, it } from "vitest";

import { parseClientDate } from "./clientDate";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function createApp() {
  return new Hono().get("/", (c) => {
    const result = parseClientDate(c, NOW);
    if (!result.success) return result.response;
    return c.json({ clientDate: result.clientDate });
  });
}

describe("parseClientDate", () => {
  it("実在する YYYY-MM-DD を受理する", async () => {
    const res = await createApp().request("/?clientDate=2024-02-29");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ clientDate: "2024-02-29" });
  });

  it("実在しない暦日を拒否する", async () => {
    const res = await createApp().request("/?clientDate=2026-02-30");

    expect(res.status).toBe(400);
  });

  it("許容上限を超える未来日を拒否する", async () => {
    const accepted = await createApp().request("/?clientDate=2026-07-22");
    const rejected = await createApp().request("/?clientDate=2026-07-23");

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(400);
  });
});
