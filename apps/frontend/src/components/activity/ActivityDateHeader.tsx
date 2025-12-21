import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover";
import { useActivityCalendar } from "@frontend/hooks/feature/activity/useActivityCalendar";
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
  const {
    calendarOpen,
    calendarMonth,
    calendarDays,
    handleCalendarOpenChange,
    handleGoToToday,
    handleGoToPreviousDay,
    handleGoToNextDay,
    handlePreviousMonth,
    handleNextMonth,
    handleCalendarDayClick,
  } = useActivityCalendar(date, setDate);

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
                    // biome-ignore lint/suspicious/noArrayIndexKey: 週インデックスは安定したキー
                    key={`week-${weekIdx}`}
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
