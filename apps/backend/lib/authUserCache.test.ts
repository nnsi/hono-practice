import { describe, expect, it } from "vitest";

import { createAuthUserCache } from "./authUserCache";

const USER = { id: "u1", name: "test" };

describe("authUserCache", () => {
  it("初回は lookup を実行し、TTL 内の 2 回目は cached を返す", async () => {
    let t = 0;
    const cache = createAuthUserCache({ ttlMs: 1000, now: () => t });
    let calls = 0;
    const lookup = async () => {
      calls++;
      return USER;
    };

    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: USER,
    });
    t = 999;
    expect(await cache.resolve("u1", lookup)).toEqual({ cached: true });
    expect(calls).toBe(1);
  });

  it("TTL 経過後は再度 lookup する", async () => {
    let t = 0;
    const cache = createAuthUserCache({ ttlMs: 1000, now: () => t });
    let calls = 0;
    const lookup = async () => {
      calls++;
      return USER;
    };

    await cache.resolve("u1", lookup);
    t = 1000;
    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: USER,
    });
    expect(calls).toBe(2);
  });

  it("未存在 (undefined) は記録しない", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000 });
    let calls = 0;
    const lookup = async () => {
      calls++;
      return undefined;
    };

    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: undefined,
    });
    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: undefined,
    });
    expect(calls).toBe(2);
    expect(cache.size()).toBe(0);
  });

  it("lookup が throw したら記録せず例外を伝える", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000 });
    await expect(
      cache.resolve("u1", async () => {
        throw new Error("db down");
      }),
    ).rejects.toThrow("db down");
    expect(cache.size()).toBe(0);
  });

  it("同一 userId の同時リクエストは 1 回の lookup を共有する", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000 });
    let calls = 0;
    let release: (() => void) | undefined;
    const lookup = () =>
      new Promise<typeof USER>((resolve) => {
        calls++;
        release = () => resolve(USER);
      });

    const first = cache.resolve("u1", lookup);
    const second = cache.resolve("u1", lookup);
    const third = cache.resolve("u1", lookup);
    release?.();

    const results = await Promise.all([first, second, third]);
    expect(calls).toBe(1);
    for (const r of results) {
      expect(r).toEqual({ cached: false, user: USER });
    }
    expect(await cache.resolve("u1", lookup)).toEqual({ cached: true });
  });

  it("invalidate 後は再度 lookup する", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000 });
    let calls = 0;
    const lookup = async () => {
      calls++;
      return USER;
    };

    await cache.resolve("u1", lookup);
    cache.invalidate("u1");
    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: USER,
    });
    expect(calls).toBe(2);
  });

  it("lookup 中に invalidate されたら結果を記録しない", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000 });
    let release: (() => void) | undefined;
    const pending = cache.resolve(
      "u1",
      () =>
        new Promise<typeof USER>((resolve) => {
          release = () => resolve(USER);
        }),
    );
    cache.invalidate("u1");
    release?.();
    expect(await pending).toEqual({ cached: false, user: USER });
    expect(cache.size()).toBe(0);
  });

  it("maxEntries を超えると最も古い entry を落とす", async () => {
    const cache = createAuthUserCache({ ttlMs: 1000, maxEntries: 2 });
    const lookup = async () => USER;

    await cache.resolve("u1", lookup);
    await cache.resolve("u2", lookup);
    await cache.resolve("u3", lookup);
    expect(cache.size()).toBe(2);
    expect(await cache.resolve("u1", lookup)).toEqual({
      cached: false,
      user: USER,
    });
    expect(await cache.resolve("u3", lookup)).toEqual({ cached: true });
  });
});
