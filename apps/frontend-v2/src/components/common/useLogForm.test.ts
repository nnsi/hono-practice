import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DexieActivity, SyncStatus } from "../../db/schema";

/** テスト用のフォームイベント。handleManualSubmit が使うのは preventDefault のみ */
const createFormEvent = () => ({ preventDefault: vi.fn() }) as Pick<
  React.FormEvent<HTMLFormElement>,
  "preventDefault"
> as React.FormEvent<HTMLFormElement>;

vi.mock("../../hooks/useActivityKinds", () => ({
  useActivityKinds: vi.fn(() => ({ kinds: [] })),
}));

vi.mock("../../hooks/useTimer", () => ({
  useTimer: vi.fn(() => ({
    isRunning: false,
    elapsedTime: 0,
    start: vi.fn(() => true),
    stop: vi.fn(),
    reset: vi.fn(),
    getElapsedSeconds: vi.fn(() => 0),
    getStartDate: vi.fn(() => null),
  })),
}));

vi.mock("../../db/activityLogRepository", () => ({
  activityLogRepository: {
    createActivityLog: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../sync/syncEngine", () => ({
  syncEngine: {
    syncActivityLogs: vi.fn(),
  },
}));

// Import after mocks
import { useLogForm } from "./useLogForm";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

function createActivity(
  overrides: Partial<DexieActivity> = {},
): DexieActivity {
  return {
    id: "act-1",
    userId: "user-1",
    name: "Test Activity",
    label: "",
    emoji: "\u{1F3C3}",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "回",
    orderIndex: "000001",
    showCombinedStats: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    _syncStatus: "synced" as SyncStatus,
    ...overrides,
  };
}

describe("useLogForm", () => {
  const onDone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTimer).mockReturnValue({
      isRunning: false,
      elapsedTime: 0,
      start: vi.fn(() => true),
      stop: vi.fn(),
      reset: vi.fn(),
      getElapsedSeconds: vi.fn(() => 0),
      getStartDate: vi.fn(() => null),
    });
  });

  describe("initial activeTab based on quantityUnit", () => {
    it('sets activeTab="timer" when quantityUnit is a time unit', () => {
      const activity = createActivity({ quantityUnit: "時間" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.activeTab).toBe("timer");
      expect(result.current.timerEnabled).toBe(true);
    });

    it('sets activeTab="manual" when quantityUnit is not a time unit', () => {
      const activity = createActivity({ quantityUnit: "回" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.activeTab).toBe("manual");
      expect(result.current.timerEnabled).toBe(false);
    });
  });

  describe("effectiveTab", () => {
    it('returns "timer" when timerEnabled and timer is running', () => {
      vi.mocked(useTimer).mockReturnValue({
        isRunning: true,
        elapsedTime: 5000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 5),
        getStartDate: vi.fn(() => new Date()),
      });

      const activity = createActivity({ quantityUnit: "時間" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.effectiveTab).toBe("timer");
    });

    it("returns activeTab when timer is not running", () => {
      vi.mocked(useTimer).mockReturnValue({
        isRunning: false,
        elapsedTime: 0,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 0),
        getStartDate: vi.fn(() => null),
      });

      const activity = createActivity({ quantityUnit: "回" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.effectiveTab).toBe("manual");
    });

    it("returns activeTab when timer is running but timerEnabled is false", () => {
      vi.mocked(useTimer).mockReturnValue({
        isRunning: true,
        elapsedTime: 5000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 5),
        getStartDate: vi.fn(() => new Date()),
      });

      const activity = createActivity({ quantityUnit: "回" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.effectiveTab).toBe("manual");
    });
  });

  describe("default state values", () => {
    it('quantity="1", memo="", selectedKindId=null, isSubmitting=false', () => {
      const activity = createActivity();
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      expect(result.current.quantity).toBe("1");
      expect(result.current.memo).toBe("");
      expect(result.current.selectedKindId).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe("handleManualSubmit", () => {
    it("saves log with parsed quantity and calls onDone", async () => {
      const activity = createActivity({ quantityUnit: "回" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      // Set quantity
      act(() => {
        result.current.setQuantity("5");
        result.current.setMemo("test memo");
      });

      const event = createFormEvent();
      await act(async () => {
        await result.current.handleManualSubmit(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(activityLogRepository.createActivityLog).toHaveBeenCalledWith({
        activityId: "act-1",
        activityKindId: null,
        quantity: 5,
        memo: "test memo",
        date: "2025-06-01",
        time: null,
      });
      expect(syncEngine.syncActivityLogs).toHaveBeenCalled();
      expect(onDone).toHaveBeenCalled();
    });

    it("saves with null quantity when quantity is empty", async () => {
      const activity = createActivity();
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      act(() => {
        result.current.setQuantity("");
      });

      await act(async () => {
        await result.current.handleManualSubmit(createFormEvent());
      });

      expect(activityLogRepository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: null }),
      );
      expect(onDone).toHaveBeenCalled();
    });

    it("does not save when quantity is non-finite (e.g. NaN)", async () => {
      const activity = createActivity();
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      act(() => {
        result.current.setQuantity("abc");
      });

      await act(async () => {
        await result.current.handleManualSubmit(createFormEvent());
      });

      expect(activityLogRepository.createActivityLog).not.toHaveBeenCalled();
      expect(onDone).not.toHaveBeenCalled();
    });

    it("saves with selectedKindId when set", async () => {
      const activity = createActivity();
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      act(() => {
        result.current.setSelectedKindId("kind-1");
      });

      await act(async () => {
        await result.current.handleManualSubmit(createFormEvent());
      });

      expect(activityLogRepository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({ activityKindId: "kind-1" }),
      );
    });
  });

  describe("handleTimerSave", () => {
    it("converts timer seconds to unit, generates memo, saves and resets", async () => {
      const mockReset = vi.fn();
      const startDate = new Date("2025-06-01T10:00:00Z");

      vi.mocked(useTimer).mockReturnValue({
        isRunning: true,
        elapsedTime: 3600000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: mockReset,
        getElapsedSeconds: vi.fn(() => 3600),
        getStartDate: vi.fn(() => startDate),
      });

      const activity = createActivity({ quantityUnit: "時間" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      await act(async () => {
        await result.current.handleTimerSave();
      });

      expect(activityLogRepository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: "act-1",
          quantity: 1, // 3600 seconds = 1 hour
        }),
      );
      expect(mockReset).toHaveBeenCalled();
      expect(syncEngine.syncActivityLogs).toHaveBeenCalled();
      expect(onDone).toHaveBeenCalled();
    });

    it("generates time memo from start/end dates", async () => {
      const startDate = new Date("2025-06-01T10:30:00Z");

      vi.mocked(useTimer).mockReturnValue({
        isRunning: true,
        elapsedTime: 1800000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 1800),
        getStartDate: vi.fn(() => startDate),
      });

      const activity = createActivity({ quantityUnit: "分" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      await act(async () => {
        await result.current.handleTimerSave();
      });

      // 1800 seconds = 30 minutes
      expect(activityLogRepository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 30,
        }),
      );

      // Memo should contain time range format
      const callArgs = vi.mocked(activityLogRepository.createActivityLog).mock
        .calls[0][0];
      expect(callArgs.memo).toMatch(/\d{2}:\d{2} - \d{2}:\d{2}/);
    });

    it("generates empty memo when getStartDate returns null", async () => {
      vi.mocked(useTimer).mockReturnValue({
        isRunning: false,
        elapsedTime: 600000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 600),
        getStartDate: vi.fn(() => null),
      });

      const activity = createActivity({ quantityUnit: "分" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      await act(async () => {
        await result.current.handleTimerSave();
      });

      const callArgs = vi.mocked(activityLogRepository.createActivityLog).mock
        .calls[0][0];
      expect(callArgs.memo).toBe("");
    });
  });

  describe("エラーハンドリング", () => {
    it("handleManualSubmit: createActivityLogが失敗するとエラーが伝播しonDoneは呼ばれない", async () => {
      vi.mocked(activityLogRepository.createActivityLog).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const activity = createActivity({ quantityUnit: "回" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      // handleManualSubmitはtry/finallyがないため、rejectされるとonDoneは呼ばれない
      await expect(
        act(async () => {
          await result.current.handleManualSubmit(createFormEvent());
        }),
      ).rejects.toThrow("DB error");

      // onDoneは呼ばれない（エラー時にはsetIsSubmitting(false)も到達しない）
      expect(onDone).not.toHaveBeenCalled();
    });

    it("handleTimerSave: createActivityLogが失敗するとエラーが伝播しonDoneは呼ばれない", async () => {
      vi.mocked(activityLogRepository.createActivityLog).mockRejectedValueOnce(
        new Error("DB error"),
      );

      vi.mocked(useTimer).mockReturnValue({
        isRunning: true,
        elapsedTime: 3600000,
        start: vi.fn(() => true),
        stop: vi.fn(),
        reset: vi.fn(),
        getElapsedSeconds: vi.fn(() => 3600),
        getStartDate: vi.fn(() => new Date("2025-06-01T10:00:00Z")),
      });

      const activity = createActivity({ quantityUnit: "時間" });
      const { result } = renderHook(() =>
        useLogForm(activity, "2025-06-01", onDone),
      );

      await expect(
        act(async () => {
          await result.current.handleTimerSave();
        }),
      ).rejects.toThrow("DB error");

      expect(onDone).not.toHaveBeenCalled();
    });
  });
});
