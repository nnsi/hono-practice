import { forwardRef } from "react";

import { TextInput, type TextInputProps } from "react-native";

/**
 * Drop-in TextInput replacement that doesn't interrupt IME composition.
 *
 * React Native's controlled TextInput (value + onChangeText) resets native
 * IME state on every re-render, making Japanese/CJK input unusable on
 * iOS/Android. This component converts value to defaultValue so the native
 * side manages text state without interference from React re-renders.
 *
 * All forms using this component are in dialogs that remount on open,
 * so defaultValue is re-applied correctly each time.
 */
export const IMESafeTextInput = forwardRef<TextInput, TextInputProps>(
  function IMESafeTextInput({ value, defaultValue, ...props }, ref) {
    return (
      <TextInput ref={ref} defaultValue={value ?? defaultValue} {...props} />
    );
  },
);
