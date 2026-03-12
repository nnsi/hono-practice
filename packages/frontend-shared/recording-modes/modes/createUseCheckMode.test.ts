// @vitest-environment jsdom

import { useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseCheckMode } from "./createUseCheckMode";

const useCheckMode = createUseCheckMode({ react: { useState } });

function makeProps(
  overrides: Partial<RecordingModeProps> = {},
): RecordingModeProps {
  return {
    activity: {
      id: "a1",
      name: "Meditation",
      emoji: "🧘",
      quantityUnit: "",
      recordingMode: "check",
      recordingModeConfig: null,
      ...overrides.activity,
    },
    kinds: [],
    date: "2025-01-01",
    onSave: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    todayLogs: [],
    ...overrides,
  };
}

describe("createUseCheckMode (no kinds)", () => {
  it("isCheckedToday is false when no todayLogs", () => {
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ todayLogs: [] })),
    );
    expect(result.current.isCheckedToday).toBe(false);
  });

  it("isCheckedToday is true when todayLogs has entries", () => {
    const { result } = renderHook(() =>
      useCheckMode(
        makeProps({
          todayLogs: [{ activityKindId: null, quantity: 1 }],
        }),
      ),
    );
    expect(result.current.isCheckedToday).toBe(true);
  });

  it("isCheckedToday is false when todayLogs is undefined", () => {
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ todayLogs: undefined })),
    );
    expect(result.current.isCheckedToday).toBe(false);
  });

  it("check calls onSave with quantity 1 and activityKindId null", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCheckMode(makeProps({ onSave })));
    act(() => result.current.check());
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: null,
      memo: "",
    });
  });

  it("hasKinds is false when kinds is empty", () => {
    const { result } = renderHook(() => useCheckMode(makeProps()));
    expect(result.current.hasKinds).toBe(false);
  });

  it("canCheck is true when not checked today", () => {
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ todayLogs: [] })),
    );
    expect(result.current.canCheck).toBe(true);
  });

  it("canCheck is false when already checked today", () => {
    const { result } = renderHook(() =>
      useCheckMode(
        makeProps({
          todayLogs: [{ activityKindId: null, quantity: 1 }],
        }),
      ),
    );
    expect(result.current.canCheck).toBe(false);
  });
});

describe("createUseCheckMode (with kinds)", () => {
  const kinds = [
    { id: "k1", name: "廊下", color: null },
    { id: "k2", name: "階段", color: null },
    { id: "k3", name: "リビング", color: "#ff0000" },
  ];

  it("hasKinds is true when kinds exist", () => {
    const { result } = renderHook(() => useCheckMode(makeProps({ kinds })));
    expect(result.current.hasKinds).toBe(true);
  });

  it("kindItems reflects checked state from todayLogs", () => {
    const { result } = renderHook(() =>
      useCheckMode(
        makeProps({
          kinds,
          todayLogs: [{ activityKindId: "k1", quantity: 1 }],
        }),
      ),
    );
    expect(result.current.kindItems).toEqual([
      { id: "k1", name: "廊下", color: null, isCheckedToday: true },
      { id: "k2", name: "階段", color: null, isCheckedToday: false },
      { id: "k3", name: "リビング", color: "#ff0000", isCheckedToday: false },
    ]);
  });

  it("canCheck is false when no kind is selected", () => {
    const { result } = renderHook(() => useCheckMode(makeProps({ kinds })));
    expect(result.current.canCheck).toBe(false);
    expect(result.current.selectedKindId).toBeNull();
  });

  it("selectKind sets selectedKindId and enables canCheck", () => {
    const { result } = renderHook(() => useCheckMode(makeProps({ kinds })));
    act(() => result.current.selectKind("k2"));
    expect(result.current.selectedKindId).toBe("k2");
    expect(result.current.canCheck).toBe(true);
  });

  it("canCheck is false when selected kind is already checked today", () => {
    const { result } = renderHook(() =>
      useCheckMode(
        makeProps({
          kinds,
          todayLogs: [{ activityKindId: "k1", quantity: 1 }],
        }),
      ),
    );
    act(() => result.current.selectKind("k1"));
    expect(result.current.canCheck).toBe(false);
  });

  it("check calls onSave with selected activityKindId", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ kinds, onSave })),
    );
    act(() => result.current.selectKind("k2"));
    act(() => result.current.check());
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: "k2",
      memo: "",
    });
  });

  it("check does nothing when canCheck is false", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ kinds, onSave })),
    );
    // No kind selected
    act(() => result.current.check());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("selectedKindId resets to null after successful check", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCheckMode(makeProps({ kinds, onSave })),
    );
    act(() => result.current.selectKind("k2"));
    await act(async () => result.current.check());
    expect(result.current.selectedKindId).toBeNull();
  });
});
