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

describe("createUseCheckMode", () => {
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

  it("check calls onSave with quantity 1", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCheckMode(makeProps({ onSave })));
    act(() => result.current.check());
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: null,
      memo: "",
    });
  });
});
