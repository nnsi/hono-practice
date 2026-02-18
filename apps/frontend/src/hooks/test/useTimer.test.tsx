import type React from "react";

import { EventBusProvider } from "@frontend/providers/EventBusProvider";
import { createWindowEventBus } from "@frontend/services/abstractions/EventBus";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モックの定義
const mockToast = vi.fn();

// モジュールのモック
vi.mock("@components/ui", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// createUseTimerのモック - タイマーの動作をシミュレートする実装
let mockTimerState = {
  isRunning: false,
  elapsedTime: 0,
  startTime: null as number | null,
};

const getCurrentElapsedTime = () => {
  if (mockTimerState.isRunning && mockTimerState.startTime) {
    return mockTimerState.elapsedTime + (Date.now() - mockTimerState.startTime);
  }
  return mockTimerState.elapsedTime;
};

const mockStart = vi.fn(() => {
  mockTimerState.isRunning = true;
  mockTimerState.startTime = Date.now();
});

const mockStop = vi.fn(() => {
  if (mockTimerState.isRunning && mockTimerState.startTime) {
    mockTimerState.elapsedTime =
      mockTimerState.elapsedTime + (Date.now() - mockTimerState.startTime);
  }
  mockTimerState.isRunning = false;
  mockTimerState.startTime = null;
});

const mockReset = vi.fn(() => {
  mockTimerState.isRunning = false;
  mockTimerState.elapsedTime = 0;
  mockTimerState.startTime = null;
});

vi.mock("@packages/frontend-shared/hooks", () => ({
  createUseTimer: vi.fn(() => ({
    get isRunning() {
      return mockTimerState.isRunning;
    },
    get elapsedTime() {
      return getCurrentElapsedTime();
    },
    start: mockStart,
    stop: mockStop,
    reset: mockReset,
    getFormattedTime: vi.fn(() => {
      const totalSeconds = Math.floor(getCurrentElapsedTime() / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }),
    getElapsedSeconds: vi.fn(() => Math.floor(getCurrentElapsedTime() / 1000)),
    getStartTime: vi.fn(() => mockTimerState.startTime),
  })),
}));

import { useTimer } from "../useTimer";

describe("useTimer", () => {
  const activityId = "test-activity-id";
  const eventBus = createWindowEventBus();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EventBusProvider eventBus={eventBus}>{children}</EventBusProvider>
  );

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T10:00:00"));
    mockToast.mockClear();

    // モックの状態をリセット
    mockTimerState = {
      isRunning: false,
      elapsedTime: 0,
      startTime: null,
    };
    mockStart.mockClear();
    mockStop.mockClear();
    mockReset.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期状態", () => {
    it("初期状態で正しい値を返す", () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.getFormattedTime()).toBe("0:00");
      expect(result.current.getElapsedSeconds()).toBe(0);
    });
  });

  describe("タイマー操作", () => {
    it("stopでタイマーが停止される", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      act(() => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.getElapsedSeconds()).toBe(5);
    });

    it("resetでタイマーがリセットされる", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      act(() => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
    });
  });

  describe("時間の計測", () => {
    it("経過時間が正しく更新される", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      act(() => {
        result.current.start();
      });

      // 100msごとに更新されることを確認
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.getElapsedSeconds()).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      expect(result.current.getElapsedSeconds()).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.getElapsedSeconds()).toBe(5);
    });
  });

  describe("フォーマット", () => {
    it("1時間未満の場合、分:秒形式で表示される", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      act(() => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(125000); // 2分5秒
      });

      expect(result.current.getFormattedTime()).toBe("2:05");
    });

    it("1時間以上の場合、時:分:秒形式で表示される", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      act(() => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(3725000); // 1時間2分5秒
      });

      expect(result.current.getFormattedTime()).toBe("1:02:05");
    });
  });

  describe("一時停止と再開", () => {
    it("停止したタイマーを再開すると経過時間が保持される", async () => {
      const { result } = renderHook(() => useTimer(activityId), { wrapper });

      // タイマー開始
      act(() => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.getElapsedSeconds()).toBe(5);

      // 停止
      act(() => {
        result.current.stop();
      });
      expect(result.current.isRunning).toBe(false);

      // 再開
      act(() => {
        result.current.start();
      });
      expect(result.current.getElapsedSeconds()).toBe(5);

      // さらに時間を進める
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.getElapsedSeconds()).toBe(8);
    });
  });
});
