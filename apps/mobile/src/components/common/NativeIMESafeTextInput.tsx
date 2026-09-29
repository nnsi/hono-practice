import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";

import { Platform, StyleSheet, TextInput, useColorScheme } from "react-native";

import type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";

export type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";

/**
 * Keep native text state uncontrolled so React updates do not overwrite IME
 * composition. Used on Android/Web and for iOS numeric/password fields.
 *
 * `value` only seeds the initial text. To replace text externally, remount the
 * input (for example when opening another record) or call the public clear().
 * Font size and input height retain the existing cross-platform layout.
 */
export const IMESafeTextInput = forwardRef<
  IMESafeTextInputRef,
  IMESafeTextInputProps
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
  const colorScheme = useColorScheme();
  const initialValue = useRef(value ?? defaultValue);
  const internalRef = useRef<TextInput>(null);

  const setRefs = useCallback(
    (node: TextInput | null) => {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<IMESafeTextInputRef | null>).current =
          node;
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
    }, 400);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const mergedStyle = useMemo(
    () => [
      styles.base,
      multiline ? styles.multiLine : styles.singleLine,
      style,
    ],
    [style, multiline],
  );

  // Default text color (overridable by caller's className - later classes win)
  const defaultTextClass = "text-gray-900 dark:text-gray-100";
  const mergedClassName = className
    ? `${defaultTextClass} ${className}`
    : defaultTextClass;

  // Keep the cursor visible in both themes. iOS Japanese text fields use the
  // SwiftUI implementation in IMESafeTextInput.ios.tsx.
  const selectionColor = colorScheme === "dark" ? "#5AC8FA" : "#007AFF";

  return (
    <TextInput
      ref={setRefs}
      defaultValue={initialValue.current}
      multiline={multiline}
      style={mergedStyle}
      className={mergedClassName}
      selectionColor={selectionColor}
      autoFocus={Platform.OS !== "android" ? autoFocus : undefined}
      accessibilityLabel={accessibilityLabel}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  base: { includeFontPadding: false, fontSize: 16 },
  singleLine: {
    height: 44,
    paddingVertical: 8,
    textAlignVertical: "center" as const,
  },
  multiLine: {
    minHeight: 44,
    maxHeight: 88,
    paddingVertical: 8,
    textAlignVertical: "top" as const,
  },
});
