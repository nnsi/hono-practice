import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventBusAdapter } from "../adapters";
import { createUseGlobalDate } from "./useGlobalDate";

// モックEventBusAdapter作成
const createMockEventBusAdapter = (): EventBusAdapter & {
  triggerEvent: (event: string, data: unknown) => void;
} => {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};

  return {
    on: vi.fn((event: string, callback: (data: unknown) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      return () => {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      };
    }),
    off: vi.fn((event: string, callback: (data: unknown) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
    }),
    emit: vi.fn((event: string, data: unknown) => {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(data));
      }
    }),
    triggerEvent: (event: string, data: unknown) => {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(data));
      }
    },
  };
};

describe("createUseGlobalDate", () => {
  let eventBus: ReturnType<typeof createMockEventBusAdapter>;
  let originalDate: DateConstructor;

  beforeEach(() => {
    eventBus = createMockEventBusAdapter();
    originalDate = global.Date;
    // 固定の日時を設定（2024年1月15日 月曜日）
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    global.Date = originalDate;
  });

  it("初期状態が今日の日付であること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-01-15T12:00:00.000Z",
    );
  });

  it("日付を設定できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    const newDate = new Date("2024-01-20T10:00:00.000Z");
    act(() => {
      result.current.setSelectedDate(newDate);
    });

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-01-20T10:00:00.000Z",
    );
    expect(eventBus.emit).toHaveBeenCalledWith("globalDate:changed", {
      date: "2024-01-20T10:00:00.000Z",
    });
  });

  it("今日に移動できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    // 別の日付に設定
    act(() => {
      result.current.setSelectedDate(new Date("2024-01-10T10:00:00.000Z"));
    });

    // 今日に戻る
    act(() => {
      result.current.goToToday();
    });

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-01-15T12:00:00.000Z",
    );
  });

  it("前日に移動できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    act(() => {
      result.current.goToPreviousDay();
    });

    expect(result.current.selectedDate.getDate()).toBe(14);
    expect(result.current.selectedDate.getMonth()).toBe(0); // 1月
    expect(result.current.selectedDate.getFullYear()).toBe(2024);
  });

  it("翌日に移動できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    act(() => {
      result.current.goToNextDay();
    });

    expect(result.current.selectedDate.getDate()).toBe(16);
    expect(result.current.selectedDate.getMonth()).toBe(0); // 1月
    expect(result.current.selectedDate.getFullYear()).toBe(2024);
  });

  it("月またぎで前日/翌日に移動できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    // 月末に設定
    act(() => {
      result.current.setSelectedDate(new Date("2024-01-31T10:00:00.000Z"));
    });

    // 翌日（2月1日）に移動
    act(() => {
      result.current.goToNextDay();
    });

    expect(result.current.selectedDate.getDate()).toBe(1);
    expect(result.current.selectedDate.getMonth()).toBe(1); // 2月

    // 前日（1月31日）に戻る
    act(() => {
      result.current.goToPreviousDay();
    });

    expect(result.current.selectedDate.getDate()).toBe(31);
    expect(result.current.selectedDate.getMonth()).toBe(0); // 1月
  });

  it("今日かどうか判定できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    const today = new Date("2024-01-15T08:00:00.000Z");
    const yesterday = new Date("2024-01-14T08:00:00.000Z");
    const tomorrow = new Date("2024-01-16T08:00:00.000Z");

    expect(result.current.isToday(today)).toBe(true);
    expect(result.current.isToday(yesterday)).toBe(false);
    expect(result.current.isToday(tomorrow)).toBe(false);
  });

  it("日付をフォーマットできること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    // 2024年1月15日は月曜日
    const date1 = new Date("2024-01-15T00:00:00.000Z");
    expect(result.current.formatDate(date1)).toBe("2024/01/15 (月)");

    // 2024年12月31日は火曜日
    const date2 = new Date("2024-12-31T00:00:00.000Z");
    expect(result.current.formatDate(date2)).toBe("2024/12/31 (火)");

    // 2024年1月1日は月曜日
    const date3 = new Date("2024-01-01T00:00:00.000Z");
    expect(result.current.formatDate(date3)).toBe("2024/01/01 (月)");
  });

  it("EventBus経由で日付の変更を受信できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    const newDate = new Date("2024-02-01T10:00:00.000Z");
    act(() => {
      eventBus.triggerEvent("globalDate:changed", {
        date: newDate.toISOString(),
      });
    });

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-02-01T10:00:00.000Z",
    );
  });

  it("EventBus経由でDate型の日付も受信できること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    const newDate = new Date("2024-02-01T10:00:00.000Z");
    act(() => {
      eventBus.triggerEvent("globalDate:changed", { date: newDate });
    });

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-02-01T10:00:00.000Z",
    );
  });

  it("無効な日付は無視されること", () => {
    const { result } = renderHook(() => createUseGlobalDate({ eventBus }));

    const initialDate = result.current.selectedDate;

    act(() => {
      eventBus.triggerEvent("globalDate:changed", { date: "invalid-date" });
    });

    expect(result.current.selectedDate).toBe(initialDate);
  });

  it("EventBusなしでも動作すること", () => {
    const { result } = renderHook(() => createUseGlobalDate());

    const newDate = new Date("2024-01-20T10:00:00.000Z");
    act(() => {
      result.current.setSelectedDate(newDate);
    });

    expect(result.current.selectedDate.toISOString()).toBe(
      "2024-01-20T10:00:00.000Z",
    );
  });

  it("unmount時にイベントリスナーが削除されること", () => {
    const { unmount } = renderHook(() => createUseGlobalDate({ eventBus }));

    unmount();

    // unmount後にイベントを発火してもエラーが発生しないことを確認
    act(() => {
      eventBus.triggerEvent("globalDate:changed", {
        date: new Date().toISOString(),
      });
    });

    // unmount後はresult.currentにアクセスできないため、ここではアクセスしない
  });
});
