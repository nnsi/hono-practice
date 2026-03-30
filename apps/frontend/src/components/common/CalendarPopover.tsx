import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import dayjs from "dayjs";

import { CalendarGrid } from "./CalendarGrid";

type CalendarPopoverProps = {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  isOpen: boolean;
  onClose: () => void;
  /** Override the outer positioning classes (default: centered below trigger) */
  popoverClassName?: string;
  /** When provided, render via portal with fixed positioning relative to this element */
  triggerRef?: React.RefObject<HTMLElement | null>;
};

export function CalendarPopover({
  selectedDate,
  onDateSelect,
  isOpen,
  onClose,
  popoverClassName,
  triggerRef,
}: CalendarPopoverProps) {
  const [viewMonth, setViewMonth] = useState(() =>
    dayjs(selectedDate).startOf("month"),
  );
  const ref = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  const updatePortalPosition = useCallback(() => {
    if (!triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = 350;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < calendarHeight && rect.top > spaceBelow;

    setPortalStyle({
      position: "fixed",
      zIndex: 9999,
      width: 280,
      top: openAbove ? rect.top - calendarHeight - gap : rect.bottom + gap,
      left: Math.min(rect.left, window.innerWidth - 288),
    });
  }, [triggerRef]);

  // 選択日が変わったらviewMonthも追従
  useEffect(() => {
    setViewMonth(dayjs(selectedDate).startOf("month"));
  }, [selectedDate]);

  // portal位置の計算・更新
  useEffect(() => {
    if (!isOpen || !triggerRef) return;
    updatePortalPosition();
    window.addEventListener("scroll", updatePortalPosition, true);
    window.addEventListener("resize", updatePortalPosition);
    return () => {
      window.removeEventListener("scroll", updatePortalPosition, true);
      window.removeEventListener("resize", updatePortalPosition);
    };
  }, [isOpen, triggerRef, updatePortalPosition]);

  // 外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const today = getToday();
  const startOfMonth = viewMonth.startOf("month");
  const startDay = startOfMonth.day(); // 0=日曜
  const daysInMonth = viewMonth.daysInMonth();

  const prevMonth = viewMonth.subtract(1, "month");
  const daysInPrevMonth = prevMonth.daysInMonth();

  const cells: { date: string; day: number; currentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      date: prevMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: viewMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: true,
    });
  }
  const remaining = 42 - cells.length;
  const nextMonth = viewMonth.add(1, "month");
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: nextMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }

  const calendarContent = (
    <div
      ref={ref}
      className={
        triggerRef
          ? undefined
          : (popoverClassName ??
            "absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-[280px]")
      }
      style={triggerRef ? portalStyle : undefined}
    >
      <CalendarGrid
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        cells={cells}
        selectedDate={selectedDate}
        today={today}
        onDateSelect={onDateSelect}
        onClose={onClose}
      />
    </div>
  );

  if (triggerRef) {
    return createPortal(calendarContent, document.body);
  }
  return calendarContent;
}
