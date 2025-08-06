import { useCallback, useState } from "react";

import dayjs from "dayjs";

export type UseActivityCalendarReturn = {
  calendarOpen: boolean;
  calendarMonth: dayjs.Dayjs;
  calendarDays: (number | null)[];
  handleCalendarOpenChange: (open: boolean) => void;
  handleGoToToday: () => void;
  handleGoToPreviousDay: () => void;
  handleGoToNextDay: () => void;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  handleCalendarDayClick: (day: number) => void;
};

export const createUseActivityCalendar = (
  date: Date,
  setDate: (date: Date) => void,
): UseActivityCalendarReturn => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs(date));

  const handleCalendarOpenChange = useCallback(
    (open: boolean) => {
      setCalendarOpen(open);
      if (open) {
        setCalendarMonth(dayjs(date));
      }
    },
    [date],
  );

  const startOfMonth = calendarMonth.startOf("month");
  const endOfMonth = calendarMonth.endOf("month");
  const daysInMonth = endOfMonth.date();
  const startDay = startOfMonth.day();

  const calendarDays: (number | null)[] = Array(startDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const handleSelectDate = useCallback(
    (day: number | null) => {
      if (!day) return;
      const newDate = calendarMonth.date(day).toDate();
      setDate(newDate);
      setCalendarOpen(false);
    },
    [calendarMonth, setDate],
  );

  // 今日の日付に移動するハンドラ
  const handleGoToToday = useCallback(() => {
    setDate(new Date());
  }, [setDate]);

  // 前日に移動するハンドラ
  const handleGoToPreviousDay = useCallback(() => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  }, [date, setDate]);

  // 翌日に移動するハンドラ
  const handleGoToNextDay = useCallback(() => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  }, [date, setDate]);

  // カレンダーの前月に移動するハンドラ
  const handlePreviousMonth = useCallback(() => {
    setCalendarMonth(calendarMonth.subtract(1, "month"));
  }, [calendarMonth]);

  // カレンダーの翌月に移動するハンドラ
  const handleNextMonth = useCallback(() => {
    setCalendarMonth(calendarMonth.add(1, "month"));
  }, [calendarMonth]);

  // カレンダーの日付選択ハンドラ
  const handleCalendarDayClick = useCallback(
    (day: number) => {
      handleSelectDate(day);
    },
    [handleSelectDate],
  );

  return {
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
  };
};
