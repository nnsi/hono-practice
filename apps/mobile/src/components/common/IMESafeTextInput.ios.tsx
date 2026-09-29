import { forwardRef, useRef } from "react";

import { Host, TextInput, type TextInputRef } from "@expo/ui";
import {
  frame,
  accessibilityLabel as labelModifier,
  lineLimit,
  textFieldStyle,
} from "@expo/ui/swift-ui/modifiers";
import { cssInterop } from "nativewind";
import { StyleSheet, View, useColorScheme } from "react-native";

import type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";
import { IMESafeTextInput as NativeIMESafeTextInput } from "./NativeIMESafeTextInput";

export type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";

const SwiftUIInput = cssInterop(
  forwardRef<IMESafeTextInputRef, IMESafeTextInputProps>(
    function SwiftUIInput(props, ref) {
      const initialValue = useRef(props.value ?? props.defaultValue);
      const inputRef = useRef<TextInputRef>(null);
      const scheme = useColorScheme();
      const {
        color,
        fontSize = 16,
        fontWeight,
        fontFamily,
        lineHeight,
        letterSpacing,
        textAlign,
        // These RN text-layout properties do not apply to the hosting View.
        textAlignVertical: _textAlignVertical,
        includeFontPadding: _includeFontPadding,
        ...boxStyle
      } = StyleSheet.flatten(props.style) ?? {};
      const modifiers = [
        textFieldStyle("plain"),
        frame({ maxWidth: Infinity, alignment: "leading" }),
      ];
      if (props.accessibilityLabel) {
        modifiers.push(labelModifier(props.accessibilityLabel));
      }
      if (props.multiline) {
        // Notes grow in the parent ScrollView; memo fields scroll after a few lines.
        modifiers.push(
          props.scrollEnabled === false
            ? lineLimit()
            : lineLimit({ min: 1, max: props.numberOfLines ?? 3 }),
        );
      }

      return (
        <View
          style={[
            { minHeight: 44, paddingVertical: 8, justifyContent: "center" },
            props.multiline && { justifyContent: "flex-start" },
            boxStyle,
          ]}
        >
          <Host
            matchContents={{ vertical: true }}
            style={{ width: "100%" }}
            colorScheme={scheme ?? "light"}
            ignoreSafeArea="all"
          >
            <TextInput
              ref={(node) => {
                inputRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
              }}
              defaultValue={initialValue.current}
              onChangeText={props.onChangeText}
              placeholder={props.placeholder}
              placeholderTextColor={props.placeholderTextColor}
              autoFocus={props.autoFocus}
              editable={props.editable}
              readOnly={props.readOnly}
              multiline={props.multiline}
              autoCapitalize={props.autoCapitalize}
              autoCorrect={props.autoCorrect}
              autoComplete={props.autoComplete}
              keyboardType={props.keyboardType}
              returnKeyType={props.returnKeyType}
              enterKeyHint={props.enterKeyHint}
              maxLength={props.maxLength}
              selectTextOnFocus={props.selectTextOnFocus}
              selectionColor={
                props.selectionColor ??
                (scheme === "dark" ? "#5AC8FA" : "#007AFF")
              }
              caretHidden={props.caretHidden}
              onFocus={props.onFocus}
              onBlur={props.onBlur}
              onSubmitEditing={() => {
                if (props.submitBehavior !== "submit") inputRef.current?.blur();
                props.onSubmitEditing?.();
              }}
              textAlign={props.textAlign ?? textAlign}
              textStyle={{
                color:
                  typeof color === "string"
                    ? color
                    : scheme === "dark"
                      ? "#f3f4f6"
                      : "#111827",
                fontSize,
                fontWeight: normalizeFontWeight(fontWeight),
                fontFamily,
                lineHeight,
                letterSpacing,
              }}
              modifiers={modifiers}
              testID={props.testID}
            />
          </Host>
        </View>
      );
    },
  ),
  { className: "style" },
);

/** SwiftUI preserves iOS marked-text underlines, unlike Fabric's TextInput. */
export const IMESafeTextInput = forwardRef<
  IMESafeTextInputRef,
  IMESafeTextInputProps
>(function IMESafeTextInput({ className = "", ...props }, ref) {
  // Passwords and numeric fields do not use Japanese composition. Retain their
  // existing keyboard, selection and autofill behavior.
  if (
    props.secureTextEntry ||
    ["numeric", "decimal-pad", "number-pad", "phone-pad"].includes(
      props.keyboardType ?? "",
    )
  ) {
    return (
      <NativeIMESafeTextInput ref={ref} className={className} {...props} />
    );
  }
  return (
    <SwiftUIInput
      {...props}
      ref={ref}
      className={`text-gray-900 dark:text-gray-100 ${className}`}
    />
  );
});

function normalizeFontWeight(
  weight: import("react-native").TextStyle["fontWeight"],
): NonNullable<import("@expo/ui").TextInputProps["textStyle"]>["fontWeight"] {
  if (weight === undefined) return undefined;
  const aliases = {
    ultralight: "100",
    thin: "100",
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    heavy: "800",
    black: "900",
    condensed: "400",
    condensedBold: "700",
  } as const;
  if (weight in aliases) return aliases[weight as keyof typeof aliases];
  return `${weight}` as
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | "normal"
    | "bold";
}
