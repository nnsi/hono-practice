// @vitest-environment jsdom
import { createRef, useImperativeHandle } from "react";

import type { TextInputProps, TextInputRef } from "@expo/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  props: {} as TextInputProps,
  focus: vi.fn(),
  blur: vi.fn(),
  clear: vi.fn(),
  isFocused: vi.fn(() => true),
  setSelection: vi.fn(async () => {}),
}));

vi.mock("nativewind", () => ({
  cssInterop: (component: unknown) => component,
}));
vi.mock("@expo/ui", () => ({
  Host: ({ children }: { children: React.ReactNode }) => children,
  TextInput: (props: TextInputProps) => {
    native.props = props;
    useImperativeHandle(props.ref, () => native as TextInputRef);
    return (
      <input
        data-testid="swift-input"
        defaultValue={props.defaultValue}
        onChange={(event) => props.onChangeText?.(event.target.value)}
      />
    );
  },
}));
vi.mock("@expo/ui/swift-ui/modifiers", () => ({
  frame: vi.fn(),
  accessibilityLabel: vi.fn(),
  lineLimit: vi.fn(),
  textFieldStyle: vi.fn(),
}));
vi.mock("./NativeIMESafeTextInput", () => ({
  IMESafeTextInput: () => <input data-testid="rn-input" />,
}));

import { IMESafeTextInput } from "./IMESafeTextInput.ios";
import type { IMESafeTextInputRef } from "./imeTextInputTypes";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("iOS IME input adapter", () => {
  it("does not echo parent text updates into the native composing field", () => {
    const onChangeText = vi.fn();
    const { rerender } = render(
      <IMESafeTextInput value="既存" onChangeText={onChangeText} />,
    );
    fireEvent.change(screen.getByTestId("swift-input"), {
      target: { value: "既存にほん" },
    });
    expect(onChangeText).toHaveBeenCalledWith("既存にほん");
    rerender(
      <IMESafeTextInput value="既存にほん" onChangeText={onChangeText} />,
    );
    expect(native.props.value).toBeUndefined();
    expect(native.props.defaultValue).toBe("既存");
    expect((screen.getByTestId("swift-input") as HTMLInputElement).value).toBe(
      "既存にほん",
    );
  });

  it("preserves quick-add submit without blurring and exposes clear/focus", () => {
    const ref = createRef<IMESafeTextInputRef>();
    const onSubmit = vi.fn();
    render(
      <IMESafeTextInput
        ref={ref}
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
      />,
    );
    native.props.onSubmitEditing?.("買い物");
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(native.blur).not.toHaveBeenCalled();
    ref.current?.clear();
    ref.current?.focus();
    expect(native.clear).toHaveBeenCalledOnce();
    expect(native.focus).toHaveBeenCalledOnce();
  });

  it("blurs on ordinary single-line submit and forwards focus events", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<IMESafeTextInput onFocus={onFocus} onBlur={onBlur} />);
    native.props.onFocus?.();
    native.props.onBlur?.();
    native.props.onSubmitEditing?.("確定");
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
    expect(native.blur).toHaveBeenCalledOnce();
  });

  it.each([
    { keyboardType: "decimal-pad" as const },
    { secureTextEntry: true },
  ])("retains the native input for numeric/password props %j", (props) => {
    render(<IMESafeTextInput {...props} />);
    expect(screen.getByTestId("rn-input")).toBeTruthy();
    expect(screen.queryByTestId("swift-input")).toBeNull();
  });
});
