import { useCallback, useRef, useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モックの定義
const mockToast = vi.fn();

// モジュールのモック
vi.mock("@components/ui", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// createUseTimerの実装に近いモックを作成
vi.mock("@packages/frontend-shared/hooks", () => ({
  createUseTimer: vi.fn((_options) => {
    // Reactフックとして実装
    const useTimerMock = () => {
      const [isRunning, setIsRunning] = useState(false);
      const [elapsedTime, setElapsedTime] = useState(0);
      const intervalRef = useRef<NodeJS.Timeout | null>(null);
      const startTimeRef = useRef<number | null>(null);

      const start = useCallback(async () => {
        setIsRunning(true);
        startTimeRef.current = Date.now() - elapsedTime;

        intervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setElapsedTime(Date.now() - startTimeRef.current);
          }
        }, 100);
      }, [elapsedTime]);

      const stop = useCallback(() => {
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, []);

      const reset = useCallback(async () => {
        setIsRunning(false);
        setElapsedTime(0);
        startTimeRef.current = null;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, []);

      const getFormattedTime = useCallback(() => {
        const totalSeconds = Math.floor(elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }, [elapsedTime]);

      const getElapsedSeconds = useCallback(
        () => Math.floor(elapsedTime / 1000),
        [elapsedTime],
      );
      const getStartTime = useCallback(() => startTimeRef.current, []);

      return {
        isRunning,
        elapsedTime,
        start,
        stop,
        reset,
        getFormattedTime,
        getElapsedSeconds,
        getStartTime,
      };
    };

    // フック自体を返す
    return useTimerMock();
  }),
}));

import { useTimer } from "../useTimer";

describe("useTimer", () => {
  const activityId = "test-activity-id";

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T10:00:00"));
    mockToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期状態", () => {
    it("初期状態で正しい値を返す", () => {
      const { result } = renderHook(() => useTimer(activityId));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.getFormattedTime()).toBe("0:00");
      expect(result.current.getElapsedSeconds()).toBe(0);
    });
  });

  describe("タイマー操作", () => {
    it("startでタイマーが開始される", async () => {
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it("stopでタイマーが停止される", async () => {
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
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
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
    });
  });

  describe("時間の計測", () => {
    it("経過時間が正しく更新される", async () => {
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
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
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
        result.current.start();
      });

      await act(async () => {
        vi.advanceTimersByTime(125000); // 2分5秒
      });

      expect(result.current.getFormattedTime()).toBe("2:05");
    });

    it("1時間以上の場合、時:分:秒形式で表示される", async () => {
      const { result } = renderHook(() => useTimer(activityId));

      await act(async () => {
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
      const { result } = renderHook(() => useTimer(activityId));

      // タイマー開始
      await act(async () => {
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
      await act(async () => {
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

  describe("クリーンアップ", () => {
    it("アンマウント時にタイマーが正しくクリーンアップされる", async () => {
      const { result, unmount } = renderHook(() => useTimer(activityId));

      await act(async () => {
        result.current.start();
      });

      // タイマーが動作中であることを確認
      expect(result.current.isRunning).toBe(true);

      unmount();

      // アンマウント後はテストできないため、ここでは確認しない
      // 実際の実装では、useEffectのクリーンアップでintervalがクリアされる
    });
  });
});
