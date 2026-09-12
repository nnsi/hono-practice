import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthDiagnosticReporter } from "./authDiagnosticReporter";

const options = {
  apiUrl: "https://api.example.test/",
  platform: "web" as const,
};
const expired = {
  event: "session_cleared" as const,
  reason: "refresh_expired" as const,
  wasLoggedIn: true,
};

function makeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    getAllKeys: vi.fn(async () => [...data.keys()]),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

const reporters: ReturnType<typeof createAuthDiagnosticReporter>[] = [];
function makeReporter(
  input: Parameters<typeof createAuthDiagnosticReporter>[0],
) {
  const reporter = createAuthDiagnosticReporter(input);
  reporters.push(reporter);
  return reporter;
}

describe("auth diagnostics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T00:00:00Z"));
  });
  afterEach(() => {
    for (const reporter of reporters.splice(0)) reporter.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reports the reset reason with safe preceding evidence and no credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const reporter = makeReporter({ ...options, storage });
    reporter.observe({
      event: "hydrate",
      reason: "local_session_present",
      hasLastLogin: true,
    });
    reporter.observe({
      event: "refresh_result",
      reason: "ok",
      requestId: "f38444fe-89f9-4cf0-87b4-1e7ae3848f17",
    });
    // Runtime unknown properties are stripped even if an upstream caller gets its type wrong.
    const event = {
      ...expired,
      token: "secret-refresh-token",
      userId: "private-user",
    };
    reporter.observe(event);
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/client-errors");
    expect(init.credentials).toBe("omit");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    const body = JSON.parse(init.body);
    expect(body.diagnostic.trigger).toEqual(expired);
    expect(
      body.diagnostic.breadcrumbs.map(
        (entry: { event: string }) => entry.event,
      ),
    ).toEqual(["hydrate", "refresh_result"]);
    expect(init.body).not.toContain("secret-refresh-token");
    expect(init.body).not.toContain("private-user");
    expect([...storage.data.values()].join()).not.toContain(
      "secret-refresh-token",
    );
  });

  it("persists offline evidence and sends it after restart without changing its flow ID", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const first = makeReporter({ ...options, storage });
    first.observe(expired);
    await first.flush();
    expect(storage.data.size).toBe(1);
    first.dispose();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const second = makeReporter({ ...options, storage });
    await second.flush();
    const sent = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
    expect(sent.diagnostic.flowId).toBe(first.flowId);
    expect(sent.diagnostic.flowId).not.toBe(second.flowId);
    expect(storage.data.size).toBe(0);
  });

  it("bounds and deduplicates an offline queue and expires old reports", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const reporter = makeReporter({ ...options, storage });
    for (let i = 0; i < 3; i++) reporter.observe(expired);
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    for (let i = 0; i < 8; i++) {
      vi.setSystemTime(Date.now() + 61_000);
      reporter.observe(expired);
      await reporter.flush();
    }
    expect(storage.data.size).toBe(6);
    reporter.dispose();
    fetchMock.mockClear();
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await makeReporter({ ...options, storage }).flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it("survives unavailable storage and UUID provider and rejects unsafe enum values", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const reporter = makeReporter({
      ...options,
      createId: () => {
        throw new Error("no crypto");
      },
      storage: {
        getItem: async () => {
          throw new Error("denied");
        },
        setItem: async () => {
          throw new Error("full");
        },
        getAllKeys: async () => {
          throw new Error("denied");
        },
        removeItem: async () => {
          throw new Error("denied");
        },
      },
    });
    reporter.observe(
      JSON.parse('{"event":"session_cleared","reason":"Bearer SECRET"}'),
    );
    reporter.observe(expired);
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].body).not.toContain("SECRET");
  });

  it("preserves sibling tabs' offline events and recovers both after their tabs close", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const first = makeReporter({ ...options, storage });
    const second = makeReporter({ ...options, storage });
    await first.flush();
    await second.flush();
    first.observe(expired);
    await first.flush();
    second.observe({ ...expired, reason: "user_logout" });
    await second.flush();
    expect(storage.data.size).toBe(2);
    expect(
      [...storage.data.values()].map((raw) => JSON.parse(raw).flowId).sort(),
    ).toEqual([first.flowId, second.flowId].sort());
    first.dispose();
    second.dispose();
    fetchMock
      .mockClear()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await makeReporter({ ...options, storage }).flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.data.size).toBe(0);
  });

  it("persists a terminal event while an earlier report is still waiting for HTTP", async () => {
    let finishFirst!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const reporter = makeReporter({ ...options, storage });
    reporter.observe({
      event: "refresh_result",
      reason: "http_401",
      status: 401,
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    reporter.observe(expired);
    await vi.waitFor(() => expect(storage.data.size).toBe(2));
    expect(
      [...storage.data.values()].some(
        (raw) => JSON.parse(raw).trigger.event === "session_cleared",
      ),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    finishFirst(new Response(null, { status: 204 }));
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.data.size).toBe(0);
  });

  it("cannot ACK a record before its outstanding storage write completes", async () => {
    const storage = makeStorage();
    let finishWrite!: () => void;
    storage.setItem.mockImplementationOnce(
      (key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            storage.data.set(key, value);
            resolve();
          };
        }),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const reporter = makeReporter({ ...options, storage });
    reporter.observe(expired);
    const sending = reporter.flush();
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledOnce());
    expect(fetchMock).not.toHaveBeenCalled();
    finishWrite();
    await sending;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.removeItem).toHaveBeenCalledWith(
      storage.setItem.mock.calls[0][0],
    );
    expect(storage.data.size).toBe(0);
  });

  it("an ACK only removes its event while another tab is persisting a different event", async () => {
    const storage = makeStorage();
    let finishFirst!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const first = makeReporter({ ...options, storage });
    first.observe(expired);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const firstKey = [...storage.data.keys()][0];
    const second = makeReporter({ ...options, storage });
    second.observe({ ...expired, reason: "user_logout" });
    await second.flush();
    expect(storage.data.size).toBe(2);
    const secondKey = [...storage.data.keys()].find((key) => key !== firstKey)!;
    finishFirst(new Response(null, { status: 204 }));
    await first.flush();
    expect(storage.data.has(firstKey)).toBe(false);
    expect(storage.data.has(secondKey)).toBe(true);
  });

  it("resumes automatically after a cooldown even when the online event came early", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const reporter = makeReporter({ ...options, storage });
    reporter.observe(expired);
    await reporter.flush();
    await vi.advanceTimersByTimeAsync(5000);
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.data.size).toBe(0);
  });

  it("bounds stored reports to 3000 bytes and at most eight allowlisted breadcrumbs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const storage = makeStorage();
    const reporter = makeReporter({
      ...options,
      storage,
      appVersion: "a".repeat(50),
      runtimeVersion: "r".repeat(50),
    });
    for (let index = 0; index < 12; index++)
      reporter.observe({
        event: "hydrate",
        reason: "local_session_present",
        source: "bootstrap",
        requestId: "10000000-0000-4000-8000-000000000001",
        status: 599,
        attempt: 2,
        durationMs: 86_400_000,
        lastLoginAgeMs: 31_536_000_000,
        hasLocalUser: true,
        hasLastLogin: true,
        wasLoggedIn: true,
        tokenSource: "secure_store",
      });
    reporter.observe(expired);
    await reporter.flush();
    const raw = [...storage.data.values()][0];
    expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(3000);
    expect(JSON.parse(raw).breadcrumbs.length).toBeLessThanOrEqual(8);
    expect(JSON.parse(raw).breadcrumbs.length).toBeGreaterThan(0);
  });

  it("dispose clears the scheduled retry without deleting durable evidence", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const storage = makeStorage();
    const reporter = makeReporter({ ...options, storage });
    reporter.observe(expired);
    await reporter.flush();
    reporter.dispose();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.data.size).toBe(1);
  });

  it("reports the first event even when the clock is close to the Unix epoch", async () => {
    vi.setSystemTime(new Date(1000));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const reporter = makeReporter(options);
    reporter.observe(expired);
    reporter.observe(expired);
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("a failed ACK removal does not cause an immediate resend loop", async () => {
    const storage = makeStorage();
    storage.removeItem.mockRejectedValue(new Error("store unavailable"));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const reporter = makeReporter({ ...options, storage });
    reporter.observe(expired);
    await reporter.flush();
    await reporter.flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.data.size).toBe(1);
  });

  it("removes corrupt diagnostic keys without touching unrelated application storage", async () => {
    const storage = makeStorage();
    storage.data.set("unrelated-setting", "keep");
    storage.data.set("actiko:auth-diagnostics:v1:invalid", "{not-json");
    storage.data.set("actiko:auth-diagnostics:v1:oversize", "x".repeat(3101));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await makeReporter({ ...options, storage }).flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect([...storage.data.entries()]).toEqual([
      ["unrelated-setting", "keep"],
    ]);
  });
});
