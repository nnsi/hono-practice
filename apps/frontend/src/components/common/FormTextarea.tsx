import { type TextareaHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function FormTextarea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={`${baseClass} ${className}`} {...props} />
  );
});
