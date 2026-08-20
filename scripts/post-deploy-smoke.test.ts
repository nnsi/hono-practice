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
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    await expect(
      smokeEndpoint("web", "https://web.example.test", fetchImpl, {
        maxAttempts: 3,
        retryDelayMs: 1,
        sleepImpl,
      }),
    ).rejects.toThrow("web smoke failed with HTTP 503");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });

  it("retries transient deployment responses before succeeding", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);

    await expect(
      smokeEndpoint("api", "https://api.example.test", fetchImpl, {
        maxAttempts: 3,
        retryDelayMs: 1,
        sleepImpl,
      }),
    ).resolves.toEqual({ name: "api", status: 200 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenNthCalledWith(1, 1);
    expect(sleepImpl).toHaveBeenNthCalledWith(2, 2);
  });
});
