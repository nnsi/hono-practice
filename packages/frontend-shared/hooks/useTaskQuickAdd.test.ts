import { useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getToday } from "../utils/dateUtils";
import { createUseTaskQuickAdd } from "./useTaskQuickAdd";

function setup(date?: string) {
  const createTask = vi.fn().mockResolvedValue(undefined);
  const syncTasks = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const useTaskQuickAdd = createUseTaskQuickAdd({
    react: { useState },
    taskRepository: { createTask },
    syncEngine: { syncTasks },
    onError,
  });
  const hook = renderHook(({ date }) => useTaskQuickAdd(date), {
    initialProps: { date },
  });
  return { ...hook, createTask, syncTasks, onError };
}

describe("useTaskQuickAdd", () => {
  it.each([
    undefined,
    "2026-09-11",
  ])("saves title only for date %s and resets for the next task", async (date) => {
    const { result, createTask, syncTasks } = setup(date);
    act(() => result.current.setTitle("  買い物  "));
    await act(async () => {
      expect(await result.current.submit()).toBe(true);
    });
    expect(createTask).toHaveBeenCalledWith({
      title: "買い物",
      startDate: date ?? getToday(),
      dueDate: null,
      activityId: null,
      activityKindId: null,
      quantity: null,
      memo: "",
    });
    expect(result.current.title).toBe("");
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setTitle("洗濯"));
    await act(async () => {
      await result.current.submit();
    });
    expect(createTask).toHaveBeenCalledTimes(2);
    expect(syncTasks).toHaveBeenCalledTimes(2);
  });

  it("rejects whitespace and overlong titles", async () => {
    const { result, createTask } = setup();
    for (const title of ["", "   ", "x".repeat(10000)]) {
      act(() => result.current.setTitle(title));
      expect(result.current.canSubmit).toBe(false);
      await act(async () => {
        expect(await result.current.submit()).toBe(false);
      });
    }
    expect(createTask).not.toHaveBeenCalled();
  });

  it("blocks duplicate submissions even before a render", async () => {
    const { result, createTask } = setup();
    let finish!: () => void;
    createTask.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    act(() => result.current.setTitle("一度だけ"));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.submit();
      void result.current.submit();
    });
    expect(result.current.isSubmitting).toBe(true);
    expect(createTask).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("retains the title after a storage failure and allows retry", async () => {
    const { result, createTask, syncTasks } = setup();
    createTask.mockRejectedValueOnce(new Error("storage unavailable"));
    act(() => result.current.setTitle("再試行"));
    await act(async () => {
      expect(await result.current.submit()).toBe(false);
    });
    expect(result.current.title).toBe("再試行");
    expect(result.current.hasError).toBe(true);
    expect(syncTasks).not.toHaveBeenCalled();
    await act(async () => {
      expect(await result.current.submit()).toBe(true);
    });
    expect(result.current.hasError).toBe(false);
  });

  it("treats a persisted task as created even when background sync fails", async () => {
    const { result, syncTasks, onError, createTask } = setup();
    const error = new Error("offline");
    syncTasks.mockRejectedValueOnce(error);
    act(() => result.current.setTitle("オフライン保存"));
    await act(async () => {
      expect(await result.current.submit()).toBe(true);
    });
    expect(result.current.title).toBe("");
    expect(result.current.hasError).toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
    expect(createTask).toHaveBeenCalledTimes(1);
  });
});
