import { forwardRef } from "react";

import { IMESafeTextInput } from "./IMESafeTextInput";
import type {
  IMESafeTextInputProps,
  IMESafeTextInputRef,
} from "./imeTextInputTypes";

const baseClass =
  "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base";

export const FormTextarea = forwardRef<
  IMESafeTextInputRef,
  Omit<IMESafeTextInputProps, "multiline">
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
