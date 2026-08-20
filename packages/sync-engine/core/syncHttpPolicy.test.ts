import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SyncProtocolError,
  classifySyncHttpStatus,
  postActivityChunkWithIsolation,
} from "./syncHttpPolicy";

type Entity = { id: string; source?: string };

function result(
  options: {
    syncedIds?: string[];
    serverWins?: Entity[];
    failures?: {
      id: string;
      code: string;
      message: string;
      retryable: boolean;
    }[];
  } = {},
) {
  return {
    syncedIds: options.syncedIds ?? [],
    skippedIds: [],
    serverWins: options.serverWins ?? [],
    failures: options.failures ?? [],
  };
}

function success(
  options: {
    activities?: ReturnType<typeof result>;
    activityKinds?: ReturnType<typeof result>;
  } = {},
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      activities: options.activities ?? result(),
      activityKinds: options.activityKinds ?? result(),
    }),
  };
}

function failure(status: number, retryAfter?: string) {
  return {
    ok: false,
    status,
    headers: { get: () => retryAfter ?? null },
    json: async () => ({}),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sync HTTP policy", () => {
  it.each([
    400, 422,
  ])("classifies record-validation status %s as permanent", (status) => {
    expect(classifySyncHttpStatus(status)).toBe("permanent");
  });

  it.each([
    401, 403, 404, 408, 409, 410, 415, 425, 429, 500, 503,
  ])("classifies endpoint/protocol status %s as retryable", (status) => {
    expect(classifySyncHttpStatus(status)).toBe("retryable");
  });

  it("backs off after 429 and retries the same chunk", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const post = vi
      .fn()
      .mockResolvedValueOnce(failure(429, "2"))
      .mockResolvedValueOnce(
        success({ activities: result({ syncedIds: ["a1"] }) }),
      );

    const response = await postActivityChunkWithIsolation({
      activities: [{ id: "a1" }],
      activityKinds: [],
      post,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(2000);
    expect(post).toHaveBeenCalledTimes(2);
    expect(response.activities.syncedIds).toEqual(["a1"]);
  });

  it("throws a retryable error when 429 retries are exhausted", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const post = vi.fn().mockResolvedValue(failure(429));

    await expect(
      postActivityChunkWithIsolation({
        activities: [{ id: "a1" }],
        activityKinds: [],
        post,
        sleep,
        max429Retries: 1,
      }),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 2000,
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("uses an HTTP-date Retry-After value", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const post = vi
      .fn()
      .mockResolvedValueOnce(failure(429, "Mon, 01 Jan 2030 00:00:05 GMT"))
      .mockResolvedValueOnce(success());

    await postActivityChunkWithIsolation({
      activities: [{ id: "a1" }],
      activityKinds: [],
      post,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("falls back to exponential delay for an invalid Retry-After value", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const post = vi
      .fn()
      .mockResolvedValueOnce(failure(429, "not-a-date"))
      .mockResolvedValueOnce(success());

    await postActivityChunkWithIsolation({
      activities: [{ id: "a1" }],
      activityKinds: [],
      post,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("isolates a permanently rejected ActivityKind", async () => {
    const response = await postActivityChunkWithIsolation({
      activities: [],
      activityKinds: [{ id: "bad-kind" }],
      post: async () => failure(422),
      sleep: async () => {},
    });

    expect(response.activities.failures).toEqual([]);
    expect(response.activityKinds.failures).toEqual([
      expect.objectContaining({
        id: "bad-kind",
        code: "HTTP_422",
        retryable: false,
      }),
    ]);
  });

  it("bisects mixed records and merges serverWins and failures from both halves", async () => {
    const post = vi.fn(async (activities: Entity[], kinds: Entity[]) => {
      if ([...activities, ...kinds].some((item) => item.id.includes("bad"))) {
        return failure(400);
      }
      return success({
        activities: result({
          serverWins: activities.map((item) => ({ ...item, source: "server" })),
        }),
        activityKinds: result({
          serverWins: kinds.map((item) => ({ ...item, source: "server" })),
        }),
      });
    });

    const response = await postActivityChunkWithIsolation({
      activities: [{ id: "server-activity" }, { id: "bad-activity" }],
      activityKinds: [{ id: "server-kind" }, { id: "bad-kind" }],
      post,
      sleep: async () => {},
    });

    expect(response.activities.serverWins).toEqual([
      { id: "server-activity", source: "server" },
    ]);
    expect(response.activityKinds.serverWins).toEqual([
      { id: "server-kind", source: "server" },
    ]);
    expect(response.activities.failures).toEqual([
      expect.objectContaining({ id: "bad-activity", code: "HTTP_400" }),
    ]);
    expect(response.activityKinds.failures).toEqual([
      expect.objectContaining({ id: "bad-kind", code: "HTTP_400" }),
    ]);
  });

  it("does not isolate endpoint/protocol failures record by record", async () => {
    const post = vi.fn().mockResolvedValue(failure(404));

    await expect(
      postActivityChunkWithIsolation({
        activities: [{ id: "a1" }, { id: "a2" }],
        activityKinds: [{ id: "k1" }],
        post,
        sleep: async () => {},
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(post).toHaveBeenCalledOnce();
  });

  it("rejects a malformed successful response without casting or isolation", async () => {
    const post = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: { syncedIds: ["a1"] } }),
    });

    await expect(
      postActivityChunkWithIsolation({
        activities: [{ id: "a1" }, { id: "a2" }],
        activityKinds: [],
        post,
        sleep: async () => {},
      }),
    ).rejects.toBeInstanceOf(SyncProtocolError);
    expect(post).toHaveBeenCalledOnce();
  });
});
