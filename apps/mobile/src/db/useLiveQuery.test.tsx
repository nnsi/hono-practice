import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const reportError = vi.hoisted(() => vi.fn());

vi.mock("../utils/errorReporter", () => ({ reportError }));

import { dbEvents } from "./dbEvents";
import { useLiveQuery } from "./useLiveQuery";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useLiveQuery", () => {
  it("遅れて完了した古いquery結果で新しい結果を上書きしない", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const query = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, unmount } = renderHook(() =>
      useLiveQuery("activities", query),
    );

    act(() => dbEvents.emit("activities"));
    await act(async () => {
      second.resolve("new");
      await second.promise;
    });
    await act(async () => {
      first.resolve("old");
      await first.promise;
    });

    expect(result.current).toBe("new");
    expect(query).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("古いqueryのrejectを報告しない", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const query = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { unmount } = renderHook(() => useLiveQuery("activities", query));

    act(() => dbEvents.emit("activities"));
    await act(async () => {
      second.resolve("new");
      await second.promise;
    });
    await act(async () => {
      first.reject(new Error("stale failure"));
      await Promise.resolve();
    });

    expect(reportError).not.toHaveBeenCalled();
    unmount();
  });

  it("unmount後は再queryもstate更新も行わない", async () => {
    const pending = deferred<string>();
    const query = vi
      .fn<() => Promise<string>>()
      .mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() =>
      useLiveQuery("activities", query),
    );

    unmount();
    act(() => dbEvents.emit("activities"));
    await act(async () => {
      pending.resolve("late");
      await pending.promise;
    });

    expect(query).toHaveBeenCalledOnce();
    expect(result.current).toBeUndefined();
    expect(reportError).not.toHaveBeenCalled();
  });
});
