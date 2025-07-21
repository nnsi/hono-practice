import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useActivityLogCreate } from "../useActivityLogCreate";

// モックの設定
const mockToast = vi.fn();
vi.mock("@components/ui", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockCreateActivityLog = vi.fn();
vi.mock("@frontend/hooks/sync/useSyncedActivityLog", () => ({
  useCreateActivityLog: () => ({
    mutateAsync: mockCreateActivityLog,
  }),
}));

let mockTimer = {
  isRunning: false,
  elapsedTime: 0,
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  getFormattedTime: vi.fn(() => "0:00"),
  getElapsedSeconds: vi.fn(() => 0),
};
vi.mock("@frontend/hooks/useTimer", () => ({
  useTimer: () => mockTimer,
}));

// React Hook Formのモック
const mockForm = {
  setValue: vi.fn(),
  getValues: vi.fn(() => ({
    date: "2025-01-20",
    quantity: 0,
    activityKindId: undefined,
  })),
  reset: vi.fn(),
  handleSubmit: (fn: any) => fn,
  formState: { errors: {} },
  register: vi.fn(),
  control: {},
  watch: vi.fn(),
};
vi.mock("react-hook-form", () => ({
  useForm: () => mockForm,
}));

// timeUtilsのモック
vi.mock("@frontend/utils/timeUtils", () => ({
  isTimeUnit: vi.fn(
    (unit) => unit === "分" || unit === "時間" || unit === "秒",
  ),
  getTimeUnitType: vi.fn((unit) => {
    if (unit === "分") return "minutes";
    if (unit === "時間") return "hours";
    if (unit === "秒") return "seconds";
    return null;
  }),
  convertSecondsToUnit: vi.fn((seconds, type) => {
    if (type === "minutes") return Math.floor(seconds / 60);
    if (type === "hours") return Math.floor(seconds / 3600);
    return seconds;
  }),
  generateTimeMemo: vi.fn((start, end) => {
    const startTime = dayjs(start).format("HH:mm");
    const endTime = dayjs(end).format("HH:mm");
    return `${startTime} - ${endTime}`;
  }),
}));

describe("useActivityLogCreate", () => {
  let mockActivity: GetActivityResponse;
  let mockDate: Date;
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2025-01-20T10:00:00"));

    // Reset mockTimer to default state
    mockTimer = {
      isRunning: false,
      elapsedTime: 0,
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      getFormattedTime: vi.fn(() => "0:00"),
      getElapsedSeconds: vi.fn(() => 0),
    };

    mockActivity = {
      id: "test-activity-id",
      name: "ランニング",
      description: "毎日のランニング",
      quantityUnit: "分",
      emoji: "🏃",
      showCombinedStats: false,
      kinds: [
        { id: "kind-1", name: "朝ラン" },
        { id: "kind-2", name: "夜ラン" },
      ],
    };

    mockDate = new Date("2025-01-20");
    mockOnOpenChange = vi.fn();
    mockOnSuccess = vi.fn();

    mockCreateActivityLog.mockResolvedValue({});
  });

  describe("初期状態", () => {
    it("初期状態が正しく設定される", () => {
      const { result } = renderHook(() =>
        useActivityLogCreate(mockActivity, mockDate, false, mockOnOpenChange),
      );

      expect(result.current.activeTab).toBe("manual");
      expect(result.current.timerStartTime).toBe(null);
      expect(result.current.timerEnabled).toBe(true);
      expect(result.current.timeUnitType).toBe("minutes");
      expect(mockForm.setValue).toHaveBeenCalledWith("date", "2025-01-20");
    });

    it("時間単位でない場合、タイマーが無効になる", () => {
      const nonTimeActivity: GetActivityResponse = {
        ...mockActivity,
        quantityUnit: "回",
      };

      const { result } = renderHook(() =>
        useActivityLogCreate(
          nonTimeActivity,
          mockDate,
          false,
          mockOnOpenChange,
        ),
      );

      expect(result.current.timerEnabled).toBe(false);
    });
  });

  describe("タブの切り替え", () => {
    it("タイマーが動作中でダイアログを開くと、自動的にタイマータブに切り替わる", () => {
      mockTimer.isRunning = true;

      const { rerender, result } = renderHook(
        ({ open }) =>
          useActivityLogCreate(mockActivity, mockDate, open, mockOnOpenChange),
        {
          initialProps: { open: false },
        },
      );

      expect(result.current.activeTab).toBe("manual");

      // ダイアログを開く
      act(() => {
        rerender({ open: true });
      });

      expect(result.current.activeTab).toBe("timer");
    });

    it("手動でタブを切り替えられる", () => {
      const { result } = renderHook(() =>
        useActivityLogCreate(mockActivity, mockDate, false, mockOnOpenChange),
      );

      act(() => {
        result.current.setActiveTab("timer");
      });
      expect(result.current.activeTab).toBe("timer");

      act(() => {
        result.current.setActiveTab("manual");
      });
      expect(result.current.activeTab).toBe("manual");
    });
  });

  describe("タイマー機能", () => {
    it("タイマーを開始できる", () => {
      const { result } = renderHook(() =>
        useActivityLogCreate(mockActivity, mockDate, false, mockOnOpenChange),
      );

      act(() => {
        result.current.handleTimerStart();
      });

      expect(mockTimer.start).toHaveBeenCalled();
      expect(result.current.timerStartTime).toBeInstanceOf(Date);
    });

    it("タイマーを停止できる", () => {
      const { result } = renderHook(() =>
        useActivityLogCreate(mockActivity, mockDate, false, mockOnOpenChange),
      );

      result.current.handleTimerStop();

      expect(mockTimer.stop).toHaveBeenCalled();
    });

    it("タイマーから記録を保存できる", async () => {
      mockTimer.getElapsedSeconds.mockReturnValue(300); // 5分

      const { result } = renderHook(() =>
        useActivityLogCreate(
          mockActivity,
          mockDate,
          false,
          mockOnOpenChange,
          mockOnSuccess,
        ),
      );

      // タイマー開始
      act(() => {
        result.current.handleTimerStart();
      });

      // タイマーから保存
      await act(async () => {
        await result.current.handleTimerSave();
      });

      await waitFor(async () => {
        expect(mockCreateActivityLog).toHaveBeenCalledWith({
          activityId: "test-activity-id",
          date: "2025-01-20",
          quantity: 5, // 300秒 = 5分
          activityKindId: undefined,
          memo: expect.stringContaining(" - "),
          activityInfo: {
            name: "ランニング",
            quantityUnit: "分",
            emoji: "🏃",
            kinds: mockActivity.kinds,
          },
        });

        expect(mockTimer.reset).toHaveBeenCalled();
        expect(mockForm.reset).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "登録完了",
          description: "アクティビティを記録しました",
          variant: "default",
        });
      });
    });
  });

  describe("手動入力での送信", () => {
    it("正常にアクティビティログを作成できる", async () => {
      mockForm.getValues.mockReturnValue({
        date: "2025-01-20",
        quantity: 30,
        activityKindId: undefined,
      });

      const { result } = renderHook(() =>
        useActivityLogCreate(
          mockActivity,
          mockDate,
          false,
          mockOnOpenChange,
          mockOnSuccess,
        ),
      );

      await result.current.onSubmit({
        date: "2025-01-20",
        quantity: 30,
        activityKindId: "kind-1",
        memo: "朝のランニング",
      });

      await waitFor(async () => {
        expect(mockCreateActivityLog).toHaveBeenCalledWith({
          activityId: "test-activity-id",
          date: "2025-01-20",
          quantity: 30,
          activityKindId: "kind-1",
          memo: "朝のランニング",
          activityInfo: {
            name: "ランニング",
            quantityUnit: "分",
            emoji: "🏃",
            kinds: mockActivity.kinds,
          },
        });

        expect(mockForm.reset).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "登録完了",
          description: "アクティビティを記録しました",
          variant: "default",
        });
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("エラー時にエラートーストを表示する", async () => {
      mockCreateActivityLog.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useActivityLogCreate(mockActivity, mockDate, false, mockOnOpenChange),
      );

      await result.current.onSubmit({
        date: "2025-01-20",
        quantity: 30,
      });

      await waitFor(async () => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "エラー",
          description: "アクティビティの記録に失敗しました",
          variant: "destructive",
        });
        expect(mockOnSuccess).not.toHaveBeenCalled();
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
      });
    });
  });

  describe("単位変換", () => {
    it("時間単位のアクティビティで正しく変換される", async () => {
      const hourActivity: GetActivityResponse = {
        ...mockActivity,
        quantityUnit: "時間",
      };

      mockTimer.getElapsedSeconds.mockReturnValue(7200); // 2時間

      const { result } = renderHook(() =>
        useActivityLogCreate(hourActivity, mockDate, false, mockOnOpenChange),
      );

      act(() => {
        result.current.handleTimerStart();
      });

      await act(async () => {
        await result.current.handleTimerSave();
      });

      await waitFor(async () => {
        expect(mockCreateActivityLog).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: 2, // 7200秒 = 2時間
          }),
        );
      });
    });

    it("秒単位のアクティビティで正しく変換される", async () => {
      const secondActivity: GetActivityResponse = {
        ...mockActivity,
        quantityUnit: "秒",
      };

      mockTimer.getElapsedSeconds.mockReturnValue(45);

      const { result } = renderHook(() =>
        useActivityLogCreate(secondActivity, mockDate, false, mockOnOpenChange),
      );

      act(() => {
        result.current.handleTimerStart();
      });

      await act(async () => {
        await result.current.handleTimerSave();
      });

      await waitFor(async () => {
        expect(mockCreateActivityLog).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: 45, // 45秒そのまま
          }),
        );
      });
    });
  });

  describe("日付の更新", () => {
    it("日付が変更されたときにフォームの日付も更新される", () => {
      const { rerender } = renderHook(
        ({ date }) =>
          useActivityLogCreate(mockActivity, date, false, mockOnOpenChange),
        {
          initialProps: { date: mockDate },
        },
      );

      const newDate = new Date("2025-01-21");
      act(() => {
        rerender({ date: newDate });
      });

      expect(mockForm.setValue).toHaveBeenLastCalledWith("date", "2025-01-21");
    });
  });
});
