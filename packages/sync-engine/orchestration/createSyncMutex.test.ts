import { describe, expect, it, vi } from "vitest";

import { createSyncMutex } from "./createSyncMutex";

describe("createSyncMutex", () => {
  it("starts not busy", () => {
    const mutex = createSyncMutex();
    expect(mutex.isBusy()).toBe(false);
  });

  it("is busy while fn is running", async () => {
    const mutex = createSyncMutex();
    let resolve: () => void;
    const blocker = new Promise<void>((r) => {
      resolve = r;
    });

    const promise = mutex.run(() => blocker);
    expect(mutex.isBusy()).toBe(true);

    resolve!();
    await promise;
    expect(mutex.isBusy()).toBe(false);
  });

  it("returns fn result on success", async () => {
    const mutex = createSyncMutex();
    const result = await mutex.run(async () => 42);
    expect(result).toBe(42);
  });

  it("returns undefined when busy (skip)", async () => {
    const mutex = createSyncMutex();
    let resolve: () => void;
    const blocker = new Promise<void>((r) => {
      resolve = r;
    });

    const first = mutex.run(() => blocker);
    const second = await mutex.run(async () => "should not run");
    expect(second).toBeUndefined();

    resolve!();
    await first;
  });

  it("releases lock even when fn throws", async () => {
    const mutex = createSyncMutex();
    await expect(
      mutex.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(mutex.isBusy()).toBe(false);

    // Should be able to run again
    const result = await mutex.run(async () => "ok");
    expect(result).toBe("ok");
  });

  it("skipped fn is not called", async () => {
    const mutex = createSyncMutex();
    let resolve: () => void;
    const blocker = new Promise<void>((r) => {
      resolve = r;
    });

    mutex.run(() => blocker);

    const skippedFn = vi.fn().mockResolvedValue(undefined);
    await mutex.run(skippedFn);
    expect(skippedFn).not.toHaveBeenCalled();

    resolve!();
  });
});
