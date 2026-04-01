import { forwardRef } from "react";

import type { TextInput, TextInputProps } from "react-native";

import { IMESafeTextInput } from "./IMESafeTextInput";

const baseClass =
  "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base";

export const FormInput = forwardRef<TextInput, TextInputProps>(
  function FormInput({ className = "", ...props }, ref) {
    return (
      <IMESafeTextInput
        ref={ref}
        className={`${baseClass} ${className}`}
        {...props}
      />
    );
  },
);
