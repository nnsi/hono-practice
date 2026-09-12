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
  it("records HTTP rejection and its server request ID without reading the token body", async () => {
    const observe = vi.fn();
    const request = vi.fn().mockResolvedValue(
      new Response("secret-body", {
        status: 401,
        headers: { "X-Request-ID": "639ec543-5194-4119-8388-f635ca6b5c82" },
      }),
    );
    expect(await requestRefreshSession(request, observe)).toEqual({
      kind: "expired",
    });
    expect(observe).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: "refresh_result",
        reason: "http_401",
        status: 401,
        attempt: 1,
        requestId: "639ec543-5194-4119-8388-f635ca6b5c82",
      }),
    );
    expect(JSON.stringify(observe.mock.calls)).not.toContain("secret-body");
  });

  it("distinguishes network, invalid response and timeout failures without exposing exceptions", async () => {
    const observe = vi.fn();
    await requestRefreshSession(
      vi
        .fn()
        .mockRejectedValueOnce(new Error("secret-error"))
        .mockResolvedValueOnce(Response.json({ token: "secret-token" })),
      observe,
    );
    expect(
      observe.mock.calls
        .filter(([entry]) => entry.event === "refresh_result")
        .map(([entry]) => entry.reason),
    ).toEqual(["network", "invalid_response"]);
    expect(JSON.stringify(observe.mock.calls)).not.toContain("secret");
    observe.mockClear();
    vi.useFakeTimers();
    const pending = requestRefreshSession(
      (signal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
      observe,
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
    expect(
      observe.mock.calls
        .filter(([entry]) => entry.event === "refresh_result")
        .map(([entry]) => entry.reason),
    ).toEqual(["timeout", "timeout"]);
  });

  it("observer failures do not cause a successful rotation to be retried", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(session));
    expect(
      await requestRefreshSession(request, () => {
        throw new Error("logger failure");
      }),
    ).toEqual({ kind: "ok", session });
    expect(request).toHaveBeenCalledOnce();
  });

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
