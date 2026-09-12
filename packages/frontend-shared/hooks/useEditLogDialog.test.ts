import { useEffect, useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActivityLogBase } from "./types";
import { createUseEditLogDialog } from "./useEditLogDialog";

function makeLog(overrides: Partial<ActivityLogBase> = {}): ActivityLogBase {
  return {
    id: "log-1",
    activityId: "act-1",
    activityKindId: null,
    quantity: 5,
    memo: "memo",
    date: "2025-06-01",
    time: null,
    ...overrides,
  };
}

function setup() {
  const updateActivityLog = vi.fn().mockResolvedValue(undefined);
  const softDeleteActivityLog = vi.fn().mockResolvedValue(undefined);
  const syncActivityLogs = vi.fn();

  const useEditLogDialog = createUseEditLogDialog({
    react: { useState, useEffect },
    useActivityKinds: () => ({ kinds: [] }),
    activityLogRepository: { updateActivityLog, softDeleteActivityLog },
    syncEngine: { syncActivityLogs },
  });

  return {
    useEditLogDialog,
    updateActivityLog,
    softDeleteActivityLog,
    syncActivityLogs,
  };
}

describe("createUseEditLogDialog", () => {
  describe("handleSave の数量バリデーション", () => {
    it("999999 (上限境界) は保存できる", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("999999");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).toHaveBeenCalledWith("log-1", {
        date: "2025-06-01",
        quantity: 999999,
        memo: "memo",
        activityKindId: null,
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("1000000 (上限超過) は保存されない", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("1000000");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it("負値は保存されない", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("-1");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it("0 (下限境界) は保存できる", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("0");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).toHaveBeenCalledWith("log-1", {
        date: "2025-06-01",
        quantity: 0,
        memo: "memo",
        activityKindId: null,
      });
    });

    it("空文字は quantity: null として保存できる", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).toHaveBeenCalledWith("log-1", {
        date: "2025-06-01",
        quantity: null,
        memo: "memo",
        activityKindId: null,
      });
    });

    it("NaN (非数値文字列) は保存されない", async () => {
      const { useEditLogDialog, updateActivityLog } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      act(() => {
        result.current.setQuantity("abc");
      });
      await act(async () => {
        await result.current.handleSave();
      });

      expect(updateActivityLog).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("完了日の編集", () => {
    it.each([
      "2025-05-31",
      "2026-01-01",
      "2024-02-29",
    ])("%s に変更して保存・同期する", async (date) => {
      const { useEditLogDialog, updateActivityLog, syncActivityLogs } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));
      expect(result.current.date).toBe(log.date);
      act(() => result.current.setDate(date));
      await act(() => result.current.handleSave());
      expect(updateActivityLog).toHaveBeenCalledWith(log.id, {
        date,
        quantity: log.quantity,
        memo: log.memo,
        activityKindId: log.activityKindId,
      });
      expect(syncActivityLogs).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it.each([
      "",
      "2025-02-29",
      "2025-04-31",
      "2025-13-01",
      "2025-6-1",
    ])("不正な日付 %s は保存・同期しない", async (date) => {
      const { useEditLogDialog, updateActivityLog, syncActivityLogs } = setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));
      act(() => result.current.setDate(date));
      await act(() => result.current.handleSave());
      expect(updateActivityLog).not.toHaveBeenCalled();
      expect(syncActivityLogs).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it("対象ログが変わったら完了日も初期化する", () => {
      const { useEditLogDialog } = setup();
      const onClose = vi.fn();
      const { result, rerender } = renderHook(
        ({ log }) => useEditLogDialog(log, onClose),
        { initialProps: { log: makeLog() } },
      );
      act(() => result.current.setDate("2025-05-31"));
      rerender({ log: makeLog({ id: "log-2", date: "2025-07-01" }) });
      expect(result.current.date).toBe("2025-07-01");
    });
  });

  describe("handleDelete", () => {
    it("softDeleteActivityLog を呼び sync して onClose する", async () => {
      const { useEditLogDialog, softDeleteActivityLog, syncActivityLogs } =
        setup();
      const onClose = vi.fn();
      const log = makeLog();
      const { result } = renderHook(() => useEditLogDialog(log, onClose));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(softDeleteActivityLog).toHaveBeenCalledWith("log-1");
      expect(syncActivityLogs).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
