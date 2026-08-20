import { describe, expect, it, vi } from "vitest";

import {
  PollingCancelledError,
  pollWithExponentialBackoff,
} from "./pollWithBackoff";

describe("pollWithExponentialBackoff", () => {
  it("retries rejected operations and stale values with exponential delays", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("matched");
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await pollWithExponentialBackoff({
      operation,
      accept: (value) => value === "matched",
      maxAttempts: 4,
      initialDelayMs: 10,
      sleep,
    });

    expect(result).toEqual({
      matched: true,
      value: "matched",
      attempts: 3,
    });
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("returns the last successful value at the configured boundary", async () => {
    const result = await pollWithExponentialBackoff({
      operation: vi.fn().mockResolvedValue("stale"),
      accept: () => false,
      maxAttempts: 2,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toEqual({
      matched: false,
      value: "stale",
      attempts: 2,
    });
  });

  it("cancels during backoff without starting another operation", async () => {
    const controller = new AbortController();
    const operation = vi.fn().mockResolvedValue("stale");
    const sleep = vi.fn(
      (_milliseconds: number, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new PollingCancelledError()),
            { once: true },
          );
        }),
    );

    const polling = pollWithExponentialBackoff({
      operation,
      accept: () => false,
      maxAttempts: 3,
      sleep,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(sleep).toHaveBeenCalledOnce());
    controller.abort();

    await expect(polling).rejects.toBeInstanceOf(PollingCancelledError);
    expect(operation).toHaveBeenCalledOnce();
  });
});
