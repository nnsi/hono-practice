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
