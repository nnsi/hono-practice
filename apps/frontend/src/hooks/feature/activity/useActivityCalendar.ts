import { useState } from "react";

import dayjs from "dayjs";

export const useActivityCalendar = (
  date: Date,
  setDate: (date: Date) => void,
) => {
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
