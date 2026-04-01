import { type InputHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100";

export const FormInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function FormInput({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${baseClass} ${className}`} {...props} />;
});
