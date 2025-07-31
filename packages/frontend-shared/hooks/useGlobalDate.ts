import { useCallback, useEffect, useState } from "react";

import type { EventBusAdapter } from "../adapters";

export type UseGlobalDateOptions = {
  eventBus?: EventBusAdapter;
};

export type UseGlobalDateReturn = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goToToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  isToday: (date: Date) => boolean;
  formatDate: (date: Date) => string;
};

export function createUseGlobalDate(
  options: UseGlobalDateOptions = {},
): UseGlobalDateReturn {
  const { eventBus } = options;
  const [selectedDate, setSelectedDateState] = useState<Date>(() => new Date());

  // Sync date changes through event bus
  useEffect(() => {
    if (!eventBus) return;

    const handleDateChange = (data: unknown) => {
      if (data && typeof data === "object" && "date" in data) {
        const dateValue = (data as { date: string | Date }).date;
        const newDate =
          typeof dateValue === "string" ? new Date(dateValue) : dateValue;
        if (!Number.isNaN(newDate.getTime())) {
          setSelectedDateState(newDate);
        }
      }
    };

    const unsubscribe = eventBus.on("globalDate:changed", handleDateChange);
    return unsubscribe;
  }, [eventBus]);

  const setSelectedDate = useCallback(
    (date: Date) => {
      setSelectedDateState(date);
      if (eventBus) {
        eventBus.emit("globalDate:changed", { date: date.toISOString() });
      }
    },
    [eventBus],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
  }, [setSelectedDate]);

  const goToPreviousDay = useCallback(() => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  }, [selectedDate, setSelectedDate]);

  const goToNextDay = useCallback(() => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  }, [selectedDate, setSelectedDate]);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }, []);

  const formatDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];

    return `${year}/${month}/${day} (${weekday})`;
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    isToday,
    formatDate,
  };
}
