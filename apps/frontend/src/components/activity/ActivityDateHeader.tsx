import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import dayjs from "dayjs";

export const ActivityDateHeader: React.FC<{
  date: Date;
  setDate: (date: Date) => void;
}> = ({ date, setDate }) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs(date));

  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (open) {
      setCalendarMonth(dayjs(date));
    }
  };

  const startOfMonth = calendarMonth.startOf("month");
  const endOfMonth = calendarMonth.endOf("month");
  const daysInMonth = endOfMonth.date();
  const startDay = startOfMonth.day();

  const calendarDays: (number | null)[] = Array(startDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const handleSelectDate = (day: number | null) => {
    if (!day) return;
    const newDate = calendarMonth.date(day).toDate();
    setDate(newDate);
    setCalendarOpen(false);
  };

  // 今日の日付に移動するハンドラ
  const handleGoToToday = () => {
    setDate(new Date());
  };

  // 前日に移動するハンドラ
  const handleGoToPreviousDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };

  // 翌日に移動するハンドラ
  const handleGoToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };

  // カレンダーの前月に移動するハンドラ
  const handlePreviousMonth = () => {
    setCalendarMonth(calendarMonth.subtract(1, "month"));
  };

  // カレンダーの翌月に移動するハンドラ
  const handleNextMonth = () => {
    setCalendarMonth(calendarMonth.add(1, "month"));
  };

  // カレンダーの日付選択ハンドラ
  const handleCalendarDayClick = (day: number) => {
    handleSelectDate(day);
  };

  return (
    <p className="flex items-center justify-center gap-2 mb-3">
      <button type="button" className="ml-1" onClick={handleGoToToday}>
        <ClockIcon />
      </button>
      <button type="button" onClick={handleGoToPreviousDay}>
        <ChevronLeftIcon />
      </button>

      {date.toLocaleDateString()}
      <button type="button" onClick={handleGoToNextDay}>
        <ChevronRightIcon />
      </button>

      <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" className="ml-1">
            <CalendarIcon />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-2">
          <div className="flex justify-between items-center mb-2">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="px-2"
            >
              &lt;
            </button>
            <span>{calendarMonth.format("YYYY年MM月")}</span>
            <button type="button" onClick={handleNextMonth} className="px-2">
              &gt;
            </button>
          </div>
          <table className="text-center select-none">
            <thead>
              <tr className="text-xs text-gray-500">
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <th key={`weekday-${d}`} className="px-1">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: calendarDays.length / 7 }).map(
                (_, weekIdx) => (
                  <tr
                    key={`week-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                      weekIdx
                    }`}
                  >
                    {calendarDays
                      .slice(weekIdx * 7, weekIdx * 7 + 7)
                      .map((day, i) => {
                        const key = day
                          ? `day-${weekIdx}-${day}`
                          : `empty-${weekIdx}-${i}`;
                        return (
                          <td key={key} className="p-1">
                            {day ? (
                              <button
                                type="button"
                                className={`w-7 h-7 rounded-full ${calendarMonth.year() === dayjs(date).year() && calendarMonth.month() === dayjs(date).month() && day === dayjs(date).date() ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                                onClick={() => handleCalendarDayClick(day)}
                              >
                                {day}
                              </button>
                            ) : (
                              <span className="w-7 h-7 inline-block" />
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </PopoverContent>
      </Popover>
    </p>
  );
};
