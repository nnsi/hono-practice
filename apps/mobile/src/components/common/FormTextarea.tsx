import { forwardRef } from "react";

import type { TextInput, TextInputProps } from "react-native";

import { IMESafeTextInput } from "./IMESafeTextInput";

const baseClass =
  "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base";

export const FormTextarea = forwardRef<
  TextInput,
  Omit<TextInputProps, "multiline">
>(function FormTextarea({ className = "", ...props }, ref) {
  return (
    <IMESafeTextInput
      ref={ref}
      className={`${baseClass} ${className}`}
      multiline
      {...props}
    />
  );
});
