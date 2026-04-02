import { type TextareaHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100";

export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function FormTextarea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={`${baseClass} ${className}`} {...props} />
  );
});
