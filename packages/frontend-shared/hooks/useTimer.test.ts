import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUseTimer } from "./useTimer";

import type {
  EventBusAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "../adapters";

// モックAdapters作成
const createMockStorageAdapter = (): StorageAdapter => {
  const storage = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) || null)),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Array.from(storage.keys()))),
  };
};

const createMockNotificationAdapter = (): NotificationAdapter => ({
  toast: vi.fn(),
  confirm: vi.fn(() => Promise.resolve(true)),
  alert: vi.fn(),
});

const createMockEventBusAdapter = (): EventBusAdapter => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
});

const createMockTimerAdapter = (): TimerAdapter<unknown> => {
  let intervalId = 0;
  const intervals = new Map<number, NodeJS.Timeout>();

  return {
    setInterval: vi.fn((callback: () => void, ms: number) => {
      const id = ++intervalId;
      const timeout = setInterval(callback, ms);
      intervals.set(id, timeout);
      return id;
    }),
    clearInterval: vi.fn((id: unknown) => {
      const timeout = intervals.get(id as number);
      if (timeout) {
        clearInterval(timeout);
        intervals.delete(id as number);
      }
    }),
  };
};

describe("createUseTimer", () => {
  let storage: StorageAdapter;
  let notification: NotificationAdapter;
  let eventBus: EventBusAdapter;
  let timer: TimerAdapter<unknown>;

  beforeEach(() => {
    storage = createMockStorageAdapter();
    notification = createMockNotificationAdapter();
    eventBus = createMockEventBusAdapter();
    timer = createMockTimerAdapter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("初期状態が正しいこと", () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedTime).toBe(0);
    expect(result.current.getFormattedTime()).toBe("0:00");
    expect(result.current.getElapsedSeconds()).toBe(0);
    expect(result.current.getStartTime()).toBe(null);
  });

  it("タイマーを開始できること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRunning).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith("timer:started", {
      activityId: "test-activity",
    });
  });

  it("タイマーが正しく時間を計測すること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1500); // 1.5秒進める
    });

    expect(result.current.getElapsedSeconds()).toBe(1);
    expect(result.current.getFormattedTime()).toBe("0:01");
  });

  it("タイマーを停止できること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRunning).toBe(false);
    expect(eventBus.emit).toHaveBeenCalledWith("timer:stopped", {
      activityId: "test-activity",
      elapsedTime: expect.any(Number),
    });
  });

  it("タイマーをリセットできること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedTime).toBe(0);
    expect(result.current.getFormattedTime()).toBe("0:00");
    expect(storage.removeItem).toHaveBeenCalledWith("timer_test-activity");
    expect(eventBus.emit).toHaveBeenCalledWith("timer:reset", {
      activityId: "test-activity",
    });
  });

  it("時間が正しくフォーマットされること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    // 1時間2分3秒進める
    act(() => {
      vi.advanceTimersByTime(3723000);
    });

    expect(result.current.getFormattedTime()).toBe("1:02:03");
  });

  it("別のタイマーが実行中の場合は開始できないこと", async () => {
    // 別のタイマーを保存
    await storage.setItem(
      "timer_other-activity",
      JSON.stringify({
        activityId: "other-activity",
        startTime: Date.now(),
        isRunning: true,
      }),
    );

    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRunning).toBe(false);
    expect(notification.toast).toHaveBeenCalledWith({
      title: "別のタイマーが実行中",
      description:
        "他のタイマーが実行中です。複数のタイマーを同時に実行することはできません。",
      variant: "destructive",
    });
  });

  it("保存されたタイマーを復元できること", async () => {
    const savedStartTime = Date.now() - 5000; // 5秒前
    await storage.setItem(
      "timer_test-activity",
      JSON.stringify({
        activityId: "test-activity",
        startTime: savedStartTime,
        isRunning: true,
      }),
    );

    const { result, rerender } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    // フックの再レンダリングで復元処理を待つ
    await act(async () => {
      rerender();
    });

    // 一定時間待機（useEffectの非同期処理を待つ）
    await vi.waitFor(() => {
      expect(result.current.isRunning).toBe(true);
    });

    expect(result.current.getElapsedSeconds()).toBeGreaterThanOrEqual(5);
    expect(notification.toast).toHaveBeenCalledWith({
      title: "タイマー継続中",
      description: "前回のタイマーを継続しています",
    });
  });

  it("状態がストレージに保存されること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    // 非同期のsetItem呼び出しを待つ
    await vi.waitFor(() => {
      expect(storage.setItem).toHaveBeenCalledWith(
        "timer_test-activity",
        expect.stringContaining('"isRunning":true'),
      );
    });
  });

  it("停止してリセットした場合、ストレージから削除されること", async () => {
    const { result } = renderHook(() =>
      createUseTimer({
        activityId: "test-activity",
        storage,
        notification,
        eventBus,
        timer,
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    await act(async () => {
      await result.current.reset();
    });

    // 非同期のremoveItem呼び出しを待つ
    await vi.waitFor(() => {
      expect(storage.removeItem).toHaveBeenCalledWith("timer_test-activity");
    });
  });
});
