import { afterEach, describe, expect, it, vi } from "vitest";

import { requestRefreshSession } from "./refreshSession";
import type { AuthSession } from "./types";

const session: AuthSession = {
  token: "fresh-access",
  user: {
    id: "user-1",
    name: null,
    providers: [],
    plan: "free",
    tabPreference: {
      tabs: ["home"],
      updatedAt: "2026-09-08T00:00:00.000Z",
    },
  },
};

afterEach(() => vi.useRealTimers());

describe("requestRefreshSession", () => {
  it.each([401, 403])("%i は再試行せず期限切れにする", async (status) => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status }));
    expect(await requestRefreshSession(request)).toEqual({ kind: "expired" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    400, 404, 429,
  ])("%i は認証を維持し、即再送しない", async (status) => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status }));
    expect(await requestRefreshSession(request)).toEqual({
      kind: "transient",
      reason: `status ${status}`,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    408, 500, 502, 503,
  ])("%i の後、一度だけ再送して復旧する", async (status) => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(Response.json(session));
    expect(await requestRefreshSession(request)).toEqual({
      kind: "ok",
      session,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("応答が失われても一度だけ再送して session を取得する", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("connection lost after rotation"))
      .mockResolvedValueOnce(Response.json(session));
    expect(await requestRefreshSession(request)).toEqual({
      kind: "ok",
      session,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("連続する通信障害は二回で止めて transient を返す", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await requestRefreshSession(request)).toEqual({
      kind: "transient",
      reason: "network",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("連続する 503 も二回で止める", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    expect(await requestRefreshSession(request)).toEqual({
      kind: "transient",
      reason: "status 503",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("15 秒の timeout 後、grace 内に新しい signal で再送する", async () => {
    vi.useFakeTimers();
    const request = vi
      .fn()
      .mockImplementationOnce(
        (signal: AbortSignal) =>
          new Promise<Response>((_, reject) => {
            signal.addEventListener("abort", () =>
              reject(new Error("timeout")),
            );
          }),
      )
      .mockResolvedValueOnce(Response.json(session));
    const result = requestRefreshSession(request);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toEqual({ kind: "ok", session });
    expect(request.mock.calls[0][0].aborted).toBe(true);
    expect(request.mock.calls[1][0].aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("headers 受信後の body 停止にも timeout を適用する", async () => {
    vi.useFakeTimers();
    const request = vi
      .fn()
      .mockImplementationOnce(
        async (signal: AbortSignal) =>
          new Response(
            new ReadableStream({
              start(controller) {
                signal.addEventListener("abort", () =>
                  controller.error(new Error("body timeout")),
                );
              },
            }),
          ),
      )
      .mockResolvedValueOnce(Response.json(session));
    const result = requestRefreshSession(request);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toEqual({ kind: "ok", session });
    expect(request).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
