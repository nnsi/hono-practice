// @vitest-environment jsdom

import { useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseNumpadMode } from "./createUseNumpadMode";

const useNumpadMode = createUseNumpadMode({ react: { useState } });

function makeProps(
  overrides: Partial<RecordingModeProps> = {},
): RecordingModeProps {
  return {
    activity: {
      id: "a1",
      name: "Score",
      emoji: "🎯",
      quantityUnit: "点",
      recordingMode: "numpad",
      recordingModeConfig: null,
      ...overrides.activity,
    },
    kinds: [],
    date: "2025-01-01",
    onSave: vi.fn(),
    isSubmitting: false,
    ...overrides,
  };
}

describe("createUseNumpadMode", () => {
  it("initializes with empty display", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    expect(result.current.display).toBe("");
    expect(result.current.formattedDisplay).toBe("0");
  });

  it("pressKey appends digits", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pressKey("3"));
    expect(result.current.display).toBe("3");
    act(() => result.current.pressKey("5"));
    expect(result.current.display).toBe("35");
    expect(result.current.formattedDisplay).toBe("35");
  });

  it("pressKey C clears display", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pressKey("3"));
    act(() => result.current.pressKey("5"));
    act(() => result.current.pressKey("C"));
    expect(result.current.display).toBe("");
  });

  it("pressKey backspace removes last digit", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pressKey("1"));
    act(() => result.current.pressKey("2"));
    act(() => result.current.pressKey("3"));
    act(() => result.current.pressKey("backspace"));
    expect(result.current.display).toBe("12");
  });

  it("formats large numbers with commas", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => {
      result.current.pressKey("1");
    });
    act(() => result.current.pressKey("2"));
    act(() => result.current.pressKey("3"));
    act(() => result.current.pressKey("4"));
    act(() => result.current.pressKey("5"));
    expect(result.current.formattedDisplay).toBe("12,345");
  });

  it("submit calls onSave with numeric value", () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useNumpadMode(makeProps({ onSave })));
    act(() => result.current.pressKey("4"));
    act(() => result.current.pressKey("2"));
    act(() => result.current.submit());
    expect(onSave).toHaveBeenCalledWith({
      quantity: 42,
      activityKindId: null,
      memo: "",
    });
  });

  it("submit does not call onSave when display is empty (value=0)", () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useNumpadMode(makeProps({ onSave })));
    act(() => result.current.submit());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exposes quantityUnit", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    expect(result.current.quantityUnit).toBe("点");
  });

  it("pasteFromClipboard sets display from text with digits only", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pasteFromClipboard("12,345"));
    expect(result.current.display).toBe("12345");
    expect(result.current.formattedDisplay).toBe("12,345");
  });

  it("pasteFromClipboard strips leading zeros", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pasteFromClipboard("00123"));
    expect(result.current.display).toBe("123");
  });

  it("pasteFromClipboard ignores empty or non-numeric input", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pressKey("5"));
    act(() => result.current.pasteFromClipboard("abc"));
    expect(result.current.display).toBe("5");
  });

  it("pasteFromClipboard truncates to MAX_DIGITS", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pasteFromClipboard("12345678901234"));
    expect(result.current.display).toBe("1234567890");
  });

  it("pasteFromClipboard ignores all-zero input", () => {
    const { result } = renderHook(() => useNumpadMode(makeProps()));
    act(() => result.current.pressKey("3"));
    act(() => result.current.pasteFromClipboard("000"));
    expect(result.current.display).toBe("3");
  });

  it("exposes kinds and isSubmitting", () => {
    const kinds = [{ id: "k1", name: "Type", color: null }];
    const { result } = renderHook(() =>
      useNumpadMode(makeProps({ kinds, isSubmitting: true })),
    );
    expect(result.current.kinds).toEqual(kinds);
    expect(result.current.isSubmitting).toBe(true);
  });
});
