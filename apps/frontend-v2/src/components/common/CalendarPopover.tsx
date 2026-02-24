import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarPopoverProps = {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  isOpen: boolean;
  onClose: () => void;
  /** Override the outer positioning classes (default: centered below trigger) */
  popoverClassName?: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function CalendarPopover({
  selectedDate,
  onDateSelect,
  isOpen,
  onClose,
  popoverClassName,
}: CalendarPopoverProps) {
  const [viewMonth, setViewMonth] = useState(() =>
    dayjs(selectedDate).startOf("month"),
  );
  const ref = useRef<HTMLDivElement>(null);

  // 選択日が変わったらviewMonthも追従
  useEffect(() => {
    setViewMonth(dayjs(selectedDate).startOf("month"));
  }, [selectedDate]);

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

  const today = dayjs().format("YYYY-MM-DD");
  const startOfMonth = viewMonth.startOf("month");
  const startDay = startOfMonth.day(); // 0=日曜
  const daysInMonth = viewMonth.daysInMonth();

  // 前月の日数（グリッド埋め用）
  const prevMonth = viewMonth.subtract(1, "month");
  const daysInPrevMonth = prevMonth.daysInMonth();

  // グリッド生成
  const cells: { date: string; day: number; currentMonth: boolean }[] = [];

  // 前月末の日
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      date: prevMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: viewMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: true,
    });
  }
  // 次月（6行=42セルまで埋める）
  const remaining = 42 - cells.length;
  const nextMonth = viewMonth.add(1, "month");
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: nextMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }

  return (
    <div
      ref={ref}
      className={
        popoverClassName ??
        "absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-[280px]"
      }
    >
      <div className="bg-white rounded-2xl shadow-lifted border border-gray-200/50 p-3 animate-scale-in origin-top">
      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth(viewMonth.subtract(1, "month"))}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">
          {viewMonth.format("YYYY年M月")}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(viewMonth.add(1, "month"))}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-medium text-gray-400 py-1"
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => {
                onDateSelect(cell.date);
                onClose();
              }}
              className={`
                w-9 h-9 flex items-center justify-center text-xs rounded-full mx-auto transition-colors
                ${!cell.currentMonth ? "text-gray-300" : "text-gray-700"}
                ${isSelected ? "bg-gray-900 text-white font-bold" : ""}
                ${isToday && !isSelected ? "bg-amber-100 text-amber-700 font-bold" : ""}
                ${!isSelected && cell.currentMonth ? "hover:bg-gray-100" : ""}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* 今日ボタン */}
      {selectedDate !== today && (
        <button
          type="button"
          onClick={() => {
            onDateSelect(today);
            onClose();
          }}
          className="w-full mt-2 py-1.5 text-xs text-amber-600 font-medium hover:bg-amber-50 rounded-xl transition-colors"
        >
          今日に移動
        </button>
      )}
      </div>
    </div>
  );
}
