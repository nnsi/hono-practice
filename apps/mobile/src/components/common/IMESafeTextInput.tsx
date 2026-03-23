import { forwardRef, useMemo, useRef } from "react";

import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from "react-native";

/**
 * Drop-in TextInput replacement that doesn't interrupt IME composition.
 *
 * React Native's controlled TextInput (value + onChangeText) resets native
 * IME state on every re-render, making Japanese/CJK input unusable on
 * iOS/Android. This component converts value to defaultValue so the native
 * side manages text state without interference from React re-renders.
 *
 * Key design decisions:
 * - defaultValue is stored in a ref so it never changes after mount,
 *   preventing native TextInput re-layout on every keystroke.
 * - Single-line inputs get fixed height (44px) and explicit paddingVertical
 *   via inline style. This ensures:
 *   (a) Android: no height fluctuation when text changes
 *   (b) iOS: correct vertical text centering for pre-filled content
 *       (iOS ignores className padding for initial defaultValue layout)
 * - All forms using this component are in dialogs that remount on open,
 *   so the ref value is re-initialized correctly each time.
 */
export const IMESafeTextInput = forwardRef<TextInput, TextInputProps>(
  function IMESafeTextInput(
    { value, defaultValue, style, multiline, ...props },
    ref,
  ) {
    const initialValue = useRef(value ?? defaultValue);
    const mergedStyle = useMemo(
      () => [styles.base, !multiline && styles.singleLine, style],
      [style, multiline],
    );

    return (
      <TextInput
        ref={ref}
        defaultValue={initialValue.current}
        multiline={multiline}
        style={mergedStyle}
        {...props}
      />
    );
  },
);

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  singleLine: {
    height: 44,
    ...Platform.select({
      // iOS positions defaultValue text lower than user-typed text.
      // Asymmetric padding compensates: less top, more bottom pushes text up.
      ios: { paddingTop: 0, paddingBottom: 7 },
      android: { paddingVertical: 8 },
    }),
  },
});
