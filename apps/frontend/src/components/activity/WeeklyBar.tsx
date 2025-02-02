import { useEffect, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import dayjs, { type Dayjs } from "dayjs";

type WeeklyBarProps = {
  selected?: Date;
  onSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
  className?: string;
};

export const WeeklyBar: React.FC<WeeklyBarProps> = ({
  selected,
  onSelect,
  onMonthChange,
  className,
}) => {
  const [currentDate, setCurrentDate] = useState(selected ?? new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(
    dayjs(currentDate).startOf("week"),
  );

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getCurrentWeeks = () => {
    const start = currentWeekStart;
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  };

  const isCurrentDate = (day: Dayjs) => {
    return day.isSame(dayjs(currentDate), "day");
  };

  const isToday = (day: Dayjs) => {
    return day.isSame(dayjs(), "day");
  };

  const handleDaySelect = (day: Dayjs) => {
    setCurrentDate(day.toDate());
    onSelect(day.toDate());
  };

  const handleWeekChange = (cursor: "prev" | "next") => {
    const newDate = dayjs(currentWeekStart).add(
      cursor === "prev" ? -7 : 7,
      "day",
    );
    setCurrentWeekStart(newDate);

    if (currentWeekStart.month() !== newDate.month()) {
      onMonthChange(newDate.toDate());
    }
  };

  useEffect(() => {
    function visibilityChange() {
      if (document.visibilityState === "visible") {
        const now = dayjs();
        handleDaySelect(now);
        setCurrentWeekStart(now.startOf("week"));
      }
    }

    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, []);

  return (
    <>
      <div className={`w-full text-sm ${className}`}>
        <div className="flex items-center justify-berween">
          <button type="button" onClick={() => handleWeekChange("prev")}>
            <ChevronLeftIcon />
          </button>
          <div className="flex-1 grid grid-cols-7 gap-1 text-center">
            {getCurrentWeeks().map((day, i) => (
              <button
                key={day.unix()}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`p-1 text-center rounded-md 
                  ${isToday(day) ? "bg-gray-100" : ""}
                  ${isCurrentDate(day) ? "text-blue-600 font-bold" : ""}`}
              >
                {weekDays[i]}
                <br />
                {day.format("M/D")}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => handleWeekChange("next")}>
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </>
  );
};
