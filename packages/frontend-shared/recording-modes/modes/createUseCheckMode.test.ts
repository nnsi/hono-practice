import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseCheckMode } from "./createUseCheckMode";

function makeUseState() {
  function useState<T>(
    init: T | (() => T),
  ): [T, (value: T | ((prev: T) => T)) => void];
  function useState<T = undefined>(): [
    T | undefined,
    (value: T | ((prev: T | undefined) => T | undefined) | undefined) => void,
  ];
  function useState<T>(init?: T | (() => T)): [T, unknown] {
    let value: T =
      init === undefined
        ? (undefined as T)
        : typeof init === "function"
          ? (init as () => T)()
          : init;
    const setValue = (v: unknown) => {
      value = typeof v === "function" ? (v as (prev: T) => T)(value) : (v as T);
    };
    return [value, setValue];
  }
  return useState;
}

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
  const useCheckMode = createUseCheckMode({
    react: { useState: makeUseState() },
  });

  it("isCheckedToday is false when no todayLogs", () => {
    const vm = useCheckMode(makeProps({ todayLogs: [] }));
    expect(vm.isCheckedToday).toBe(false);
  });

  it("isCheckedToday is true when todayLogs has entries", () => {
    const vm = useCheckMode(
      makeProps({
        todayLogs: [{ activityKindId: null, quantity: 1 }],
      }),
    );
    expect(vm.isCheckedToday).toBe(true);
  });

  it("isCheckedToday is false when todayLogs is undefined", () => {
    const vm = useCheckMode(makeProps({ todayLogs: undefined }));
    expect(vm.isCheckedToday).toBe(false);
  });

  it("check calls onSave with quantity 1", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const vm = useCheckMode(makeProps({ onSave }));
    vm.check();
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: null,
      memo: "",
    });
  });
});
