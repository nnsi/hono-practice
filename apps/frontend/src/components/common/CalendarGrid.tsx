import { useTranslation } from "@packages/i18n";
import type { Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarCell = { date: string; day: number; currentMonth: boolean };

const WEEKDAY_KEYS = [
  "calendar.sun",
  "calendar.mon",
  "calendar.tue",
  "calendar.wed",
  "calendar.thu",
  "calendar.fri",
  "calendar.sat",
] as const;

type CalendarGridProps = {
  viewMonth: Dayjs;
  setViewMonth: (m: Dayjs) => void;
  cells: CalendarCell[];
  selectedDate: string;
  today: string;
  onDateSelect: (date: string) => void;
  onClose: () => void;
};

export function CalendarGrid({
  viewMonth,
  setViewMonth,
  cells,
  selectedDate,
  today,
  onDateSelect,
  onClose,
}: CalendarGridProps) {
  const { t } = useTranslation(["stats", "common"]);

  return (
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
          {viewMonth.format(t("monthYearFormat"))}
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
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            className="text-center text-[10px] font-medium text-gray-400 py-1"
          >
            {t(`common:${key}`)}
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
          {t("common:calendar.goToToday")}
        </button>
      )}
    </div>
  );
}
