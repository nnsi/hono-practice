import { useRef, useState } from "react";

import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import dayjs from "dayjs";
import { Calendar, X } from "lucide-react";

import { CalendarPopover } from "./CalendarPopover";

type DatePickerFieldProps = {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
};

export function DatePickerField({
  value,
  onChange,
  placeholder = "未設定",
  disabled = false,
  allowClear = false,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Prevent re-open when CalendarPopover's outside-click fires before the button click
  const justClosedRef = useRef(false);

  const displayText = value ? dayjs(value).format("YYYY/MM/DD") : placeholder;

  const handleToggle = () => {
    if (disabled) return;
    if (justClosedRef.current) {
      justClosedRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
    justClosedRef.current = true;
    requestAnimationFrame(() => {
      justClosedRef.current = false;
    });
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center gap-2
          transition-colors
          disabled:bg-gray-100 disabled:text-gray-500
          ${isOpen ? "ring-2 ring-blue-500 border-transparent" : "border-gray-300"}`}
      >
        <Calendar size={14} className="text-gray-400 shrink-0" />
        <span
          className={`truncate ${value ? "text-gray-900" : "text-gray-400"}`}
        >
          {displayText}
        </span>
        {allowClear && value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onChange("");
              }
            }}
            className="ml-auto p-0.5 hover:bg-gray-100 rounded shrink-0"
          >
            <X size={12} className="text-gray-400" />
          </span>
        )}
      </button>
      <CalendarPopover
        selectedDate={value || getToday()}
        onDateSelect={(date) => {
          onChange(date);
          handleClose();
        }}
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={triggerRef}
      />
    </div>
  );
}
