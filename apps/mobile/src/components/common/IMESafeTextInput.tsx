import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";

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
export const IMESafeTextInput = forwardRef<
  TextInput,
  TextInputProps & { className?: string }
>(function IMESafeTextInput(
  {
    value,
    defaultValue,
    style,
    multiline,
    autoFocus,
    accessibilityLabel,
    className,
    ...props
  },
  ref,
) {
  const initialValue = useRef(value ?? defaultValue);
  const internalRef = useRef<TextInput>(null);

  const setRefs = useCallback(
    (node: TextInput | null) => {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<TextInput | null>).current = node;
      }
    },
    [ref],
  );

  // Android: autoFocus sets focus but doesn't open the keyboard.
  // Programmatic .focus() after a short delay reliably shows it.
  useEffect(() => {
    if (!autoFocus || Platform.OS !== "android") return;
    const timer = setTimeout(() => {
      internalRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const mergedStyle = useMemo(
    () => [styles.base, !multiline && styles.singleLine, style],
    [style, multiline],
  );

  // Default text color (overridable by caller's className - later classes win)
  const defaultTextClass = "text-gray-900 dark:text-gray-100";
  const mergedClassName = className
    ? `${defaultTextClass} ${className}`
    : defaultTextClass;

  return (
    <TextInput
      ref={setRefs}
      defaultValue={initialValue.current}
      multiline={multiline}
      style={mergedStyle}
      className={mergedClassName}
      autoFocus={Platform.OS !== "android" ? autoFocus : undefined}
      accessibilityLabel={accessibilityLabel}
      {...props}
    />
  );
});

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
