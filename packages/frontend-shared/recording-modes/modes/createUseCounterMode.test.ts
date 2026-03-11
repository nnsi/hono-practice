import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseCounterMode } from "./createUseCounterMode";

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
      name: "Push-ups",
      emoji: "💪",
      quantityUnit: "回",
      recordingMode: "counter",
      recordingModeConfig: '{"mode":"counter","steps":[1,5,10]}',
      ...overrides.activity,
    },
    kinds: [],
    date: "2025-01-01",
    onSave: vi.fn(),
    isSubmitting: false,
    ...overrides,
  };
}

describe("createUseCounterMode", () => {
  const useCounterMode = createUseCounterMode({
    react: { useState: makeUseState() },
  });

  it("initializes with count 0", () => {
    const vm = useCounterMode(makeProps());
    expect(vm.count).toBe(0);
  });

  it("parses steps from activity config", () => {
    const vm = useCounterMode(makeProps());
    expect(vm.steps).toEqual([1, 5, 10]);
  });

  it("falls back to default steps when config is null", () => {
    const vm = useCounterMode(
      makeProps({
        activity: {
          id: "a1",
          name: "Test",
          emoji: "📝",
          quantityUnit: "回",
          recordingMode: "counter",
          recordingModeConfig: null,
        },
      }),
    );
    expect(vm.steps).toEqual([1, 10, 100]);
  });

  it("falls back to default steps for invalid config", () => {
    const vm = useCounterMode(
      makeProps({
        activity: {
          id: "a1",
          name: "Test",
          emoji: "📝",
          quantityUnit: "回",
          recordingMode: "counter",
          recordingModeConfig: "{invalid}",
        },
      }),
    );
    expect(vm.steps).toEqual([1, 10, 100]);
  });

  it("submit calls onSave with current count", () => {
    const onSave = vi.fn();
    const vm = useCounterMode(makeProps({ onSave }));
    vm.submit();
    expect(onSave).toHaveBeenCalledWith({
      quantity: 0,
      memo: "",
      activityKindId: null,
    });
  });

  it("exposes quantityUnit from activity", () => {
    const vm = useCounterMode(makeProps());
    expect(vm.quantityUnit).toBe("回");
  });

  it("exposes kinds and isSubmitting from props", () => {
    const kinds = [{ id: "k1", name: "Sprint", color: "#ff0000" }];
    const vm = useCounterMode(makeProps({ kinds, isSubmitting: true }));
    expect(vm.kinds).toEqual(kinds);
    expect(vm.isSubmitting).toBe(true);
  });
});
