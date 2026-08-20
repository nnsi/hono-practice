import { describe, expect, it, vi } from "vitest";

import { smokeEndpoint } from "./post-deploy-smoke.js";

describe("post-deploy smoke", () => {
  it("accepts a successful endpoint without logging response content", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("sensitive", { status: 200 }));
    await expect(
      smokeEndpoint("api", "https://api.example.test", fetchImpl),
    ).resolves.toEqual({
      name: "api",
      status: 200,
    });
  });

  it("fails with endpoint name and status only", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("secret body", { status: 503 }));
    await expect(
      smokeEndpoint("web", "https://web.example.test", fetchImpl),
    ).rejects.toThrow("web smoke failed with HTTP 503");
  });
});
