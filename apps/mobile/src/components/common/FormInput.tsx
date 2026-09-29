import { forwardRef } from "react";

import { IMESafeTextInput } from "./IMESafeTextInput";
import type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";

const baseClass =
  "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base";

export const FormInput = forwardRef<IMESafeTextInputRef, IMESafeTextInputProps>(
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
