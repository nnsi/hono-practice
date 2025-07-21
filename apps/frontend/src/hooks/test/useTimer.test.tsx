import { createMockStorage } from "@frontend/test-utils";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTimer } from "../useTimer";

// useToastのモック
const mockToast = vi.fn();
vi.mock("@components/ui", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useTimer", () => {
  const activityId = "test-activity-id";
  const storageKey = `timer_${activityId}`;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T10:00:00"));
    mockToast.mockClear();

    // localStorageのモック
    mockStorage = createMockStorage();
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });
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
    it("startでタイマーが開始される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        storageKey,
        expect.stringContaining('"isRunning":true'),
      );
    });

    it("stopでタイマーが停止される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.getElapsedSeconds()).toBe(5);
    });

    it("resetでタイマーがリセットされる", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(storageKey);
    });
  });

  describe("時間の計測", () => {
    it("経過時間が正しく更新される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });

      // 100msごとに更新されることを確認
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.getElapsedSeconds()).toBe(0);

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(result.current.getElapsedSeconds()).toBe(1);

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.getElapsedSeconds()).toBe(5);
    });
  });

  describe("フォーマット", () => {
    it("1時間未満の場合、分:秒形式で表示される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });
      act(() => {
        vi.advanceTimersByTime(125000); // 2分5秒
      });

      expect(result.current.getFormattedTime()).toBe("2:05");
    });

    it("1時間以上の場合、時:分:秒形式で表示される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });
      act(() => {
        vi.advanceTimersByTime(3725000); // 1時間2分5秒
      });

      expect(result.current.getFormattedTime()).toBe("1:02:05");
    });
  });

  describe("localStorage永続化", () => {
    it("実行中のタイマーがlocalStorageから復元される", () => {
      const persistData = {
        activityId,
        startTime: Date.now() - 5000,
        isRunning: true,
      };
      mockStorage.setItem(storageKey, JSON.stringify(persistData));

      const { result } = renderHook(() => useTimer(activityId));

      expect(result.current.isRunning).toBe(true);
      expect(result.current.getElapsedSeconds()).toBe(5);
      expect(mockToast).toHaveBeenCalledWith({
        title: "タイマー継続中",
        description: "前回のタイマーを継続しています",
      });
    });

    it("不正なlocalStorageデータは無視される", () => {
      mockStorage.setItem(storageKey, "invalid json");

      const { result } = renderHook(() => useTimer(activityId));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(storageKey);
    });
  });

  describe("タブ間同期", () => {
    it("他のタブでタイマーが開始されたときに通知される", () => {
      renderHook(() => useTimer(activityId));

      const storageEvent = new StorageEvent("storage", {
        key: storageKey,
        newValue: JSON.stringify({
          activityId,
          startTime: Date.now(),
          isRunning: true,
        }),
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "タイマーが他のタブで開始されました",
        description: "このタブのタイマーは無効になります",
        variant: "destructive",
      });
    });
  });

  describe("複数タイマーの制限", () => {
    it("他のアクティビティでタイマーが実行中の場合、開始できない", () => {
      // 他のアクティビティのタイマーを設定
      const otherTimerKey = "timer_other-activity";
      mockStorage.setItem(
        otherTimerKey,
        JSON.stringify({
          activityId: "other-activity",
          startTime: Date.now(),
          isRunning: true,
        }),
      );

      const { result } = renderHook(() => useTimer(activityId));

      // 初期状態を確認
      expect(result.current.isRunning).toBe(false);

      // localStorageの内容を確認
      // Object.keys doesn't work on the mock, need to check the actual storage
      expect(mockStorage.getItem(otherTimerKey)).toBeTruthy();

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: "別のタイマーが実行中",
        description:
          "他のタブでタイマーが実行中です。複数のタイマーを同時に実行することはできません。",
        variant: "destructive",
      });
    });

    it("同じアクティビティのタイマーは開始できる", () => {
      // 同じアクティビティの停止中のタイマーを設定
      mockStorage.setItem(
        storageKey,
        JSON.stringify({
          activityId,
          startTime: Date.now() - 5000,
          isRunning: false,
        }),
      );

      const { result } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
    });
  });

  describe("一時停止と再開", () => {
    it("停止したタイマーを再開すると経過時間が保持される", () => {
      const { result } = renderHook(() => useTimer(activityId));

      // タイマー開始
      act(() => {
        result.current.start();
      });
      act(() => {
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
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.getElapsedSeconds()).toBe(8);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にintervalがクリアされる", () => {
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");
      const { result, unmount } = renderHook(() => useTimer(activityId));

      act(() => {
        result.current.start();
      });
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("アンマウント時にstorageイベントリスナーが削除される", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useTimer(activityId));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "storage",
        expect.any(Function),
      );
    });
  });
});
